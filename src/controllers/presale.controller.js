import mongoose from "mongoose";
import { Presale } from "../models/presale.model.js";
import { LeadProject } from "../models/leadProject.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 11 Pipeline Stages Master Configuration
export const STAGE_NAMES = {
  1: "Visit",
  2: "Site Briefing",
  3: "Tentative Quotation — Formation",
  4: "Tentative Quotation — Client Acceptance",
  5: "Concept Drawing — Formation & Finalisation",
  6: "Bank Quotation — Formation & Handover",
  7: "Structure Work — Formation",
  8: "Front Elevation — Formation & Finalisation",
  9: "Material Finalisation",
  10: "Final Quotation — Formation & Client Acceptance",
  11: "Contract Formation & Acceptance"
};

// Helper: Normalize engagement scope to valid schema enums
export const normalizeScope = (scope) => {
  if (!scope || typeof scope !== "string") return "Design + Construction";
  const s = scope.toLowerCase().trim();
  if (s.includes("consult")) return "Consultancy Only";
  if (s.includes("design") && !s.includes("construct")) return "Design Only";
  return "Design + Construction";
};

// Helper: Get Maximum Allowed Stage for Scope
export const getMaxStageForScope = (scope) => {
  const norm = normalizeScope(scope);
  if (norm === "Consultancy Only") return 2;
  if (norm === "Design Only") return 10;
  return 11; // Design + Construction
};

// Helper: Determine if stage data satisfies minimum completion criteria
export const isStageDataComplete = (stageId, data = {}) => {
  if (!data || typeof data !== "object") return false;

  // Check if at least one meaningful field has been filled
  const hasValues = Object.entries(data).some(([key, val]) => {
    if (val === null || val === undefined || val === "") return false;
    if (typeof val === "string" && val.trim() === "") return false;
    if (key === "status" && String(val).toUpperCase() === "NOT ATTENDED") return false;
    return true;
  });

  return hasValues;
};

/**
 * 1. GET PRESALE BY PROJECT ID
 * GET /api/v1/presales/:projectId
 */
export const getPresaleByProjectId = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid Project ID is required");
  }

  let presale = await Presale.findOne({ "projectDetails.projectId": projectId });

  // If not created yet, initialize default structure from LeadProject
  if (!presale) {
    const project = await LeadProject.findById(projectId);
    if (!project) {
      throw new ApiError(404, "Lead Project not found");
    }

    const scope = normalizeScope(project.businessType || "Design + Construction");
    const initialStages = [];
    for (let i = 1; i <= 11; i++) {
      initialStages.push({
        stageId: i,
        stageName: STAGE_NAMES[i],
        status: i === 1 ? "active" : "pending",
        data: {}
      });
    }

    presale = await Presale.create({
      projectDetails: {
        projectId: project._id,
        leadId: project.leadId,
        clientName: project.clientName,
        phoneNumber: project.phoneNumber,
        projectName: project.projectName || project.workCategory || "",
        currentActivePerson: project.nextPersonName || project.projectCoordinatorName || "Admin",
        engagementScope: scope,
        totalStages: getMaxStageForScope(scope),
        currentStageId: 1,
        currentStageName: STAGE_NAMES[1],
        projectStatus: "On Track",
        projectSubStatus: "VISIT"
      },
      stages: initialStages,
      stageHistory: [],
      remarks: [],
      presaleStatus: "In Progress",
      createdBy: req.user?._id || null,
      createdByName: req.user?.name || "Admin",
      updatedBy: req.user?._id || null,
      updatedByName: req.user?.name || "Admin"
    });
  }

  return res.status(200).json(new ApiResponse(200, presale, "Presale details fetched successfully"));
});

/**
 * 2. SAVE STAGE DATA & VALIDATE SEQUENTIAL PROGRESSION
 * PUT /api/v1/presales/save-stage
 */
export const saveStageData = asyncHandler(async (req, res) => {
  const {
    projectId,
    stageId: passedStageId,
    stageData = {},
    engagementScope,
    projectStatus,
    projectSubStatus,
    activePerson,
    userName
  } = req.body;

  const stageId = Number(passedStageId);

  if (!projectId || !stageId || isNaN(stageId)) {
    throw new ApiError(400, "Valid Project ID and Numeric Stage ID are required");
  }

  const currentUserId = req.user?._id || null;
  const currentUserName = req.user?.name || userName || activePerson || "Admin";

  // 1. Fetch or initialize Presale record
  let presale = await Presale.findOne({ "projectDetails.projectId": projectId });
  if (!presale) {
    const project = await LeadProject.findById(projectId);
    if (!project) throw new ApiError(404, "Lead Project not found");

    const scope = normalizeScope(engagementScope || project.businessType || "Design + Construction");
    const initialStages = [];
    for (let i = 1; i <= 11; i++) {
      initialStages.push({
        stageId: i,
        stageName: STAGE_NAMES[i],
        status: i === 1 ? "active" : "pending",
        data: {}
      });
    }

    presale = new Presale({
      projectDetails: {
        projectId: project._id,
        leadId: project.leadId,
        clientName: project.clientName,
        phoneNumber: project.phoneNumber,
        projectName: project.projectName || project.workCategory || "",
        currentActivePerson: activePerson || currentUserName,
        engagementScope: scope,
        totalStages: getMaxStageForScope(scope),
        currentStageId: 1,
        currentStageName: STAGE_NAMES[1],
        projectStatus: projectStatus || "On Track",
        projectSubStatus: projectSubStatus || "VISIT"
      },
      stages: initialStages,
      stageHistory: [],
      remarks: [],
      presaleStatus: "In Progress"
    });
  }

  // 2. Prevent edit if Presale is already closed
  if (presale.presaleStatus === "Closed") {
    throw new ApiError(
      400,
      `This Presale is Closed (${presale.closureReason || "Client Not Interested / Dropped"}). Cannot edit unless reopened.`
    );
  }

  // 3. Resolve Scope & Boundaries
  const effectiveScope = normalizeScope(engagementScope || presale.projectDetails.engagementScope || "Design + Construction");
  const maxAllowedStage = getMaxStageForScope(effectiveScope);

  if (stageId > maxAllowedStage) {
    throw new ApiError(
      400,
      `Stage ${stageId} is locked under Scope '${effectiveScope}'. Upgrade Scope to access.`
    );
  }

  // 4. Sequential Stage Gating: Ensure all previous stages are completed
  if (stageId > 1) {
    for (let prevId = 1; prevId < stageId; prevId++) {
      const prevStage = presale.stages.find((s) => s.stageId === prevId);
      const isComplete = prevStage && (prevStage.status === "completed" || prevStage.status === "skipped");
      if (!isComplete) {
        throw new ApiError(
          400,
          `Stage ${stageId} par nahi ja sakte! Pehle Stage ${prevId} (${STAGE_NAMES[prevId]}) ko complete karein.`
        );
      }
    }
  }

  // 5. Check if rejection/drop happened in this stage (e.g. Stage 4 or Stage 10)
  const acceptanceStatus = String(stageData?.status || stageData?.acceptanceStatus || "").toUpperCase().trim();
  const isRejected = [
    "ATTENDED - NOT INTERESTED",
    "NO RESPONSE FROM LONG TIME - BY CLIENT"
  ].includes(acceptanceStatus);

  // Find or insert stage object
  let stageObj = presale.stages.find((s) => s.stageId === stageId);
  if (!stageObj) {
    stageObj = {
      stageId,
      stageName: STAGE_NAMES[stageId],
      status: "active",
      data: stageData
    };
    presale.stages.push(stageObj);
  }

  stageObj.data = stageData;
  stageObj.updatedAt = new Date();

  let historyAction = "updated";

  // 6. Handle Rejection / Closure
  if (isRejected) {
    stageObj.status = "rejected";
    presale.presaleStatus = "Closed";
    presale.closureReason = `Closed at Stage ${stageId} (${STAGE_NAMES[stageId]}): Client selected "${acceptanceStatus}"`;
    presale.closedAtStage = stageId;
    historyAction = "closed_here";
  } else {
    // Check if stage is complete (or explicitly marked completed by Save & Next)
    const isComplete =
      req.body.isCompleted !== undefined
        ? Boolean(req.body.isCompleted)
        : true;

    if (isComplete) {
      // If completion date is not provided, auto-fill today's date
      if (!stageData.completionDate && !stageData.visitCompletedDate && !stageData.finalContractSignDate) {
        stageData.completionDate = new Date().toISOString().split("T")[0];
      }
      stageObj.data = stageData;
      stageObj.status = "completed";
      stageObj.completedAt = new Date(); // Date + Time
      stageObj.completedBy = currentUserId;
      stageObj.completedByName = currentUserName;
      historyAction = "completed";

      // If scope limit reached, mark Presale as Completed
      if (stageId === maxAllowedStage) {
        presale.presaleStatus = "Completed";
      } else {
        // Unlock next stage
        const nextStageId = stageId + 1;
        const nextStageObj = presale.stages.find((s) => s.stageId === nextStageId);
        if (nextStageObj && nextStageObj.status === "pending") {
          nextStageObj.status = "active";
        }
        presale.projectDetails.currentStageId = Math.max(
          presale.projectDetails.currentStageId || 1,
          nextStageId
        );
        presale.projectDetails.currentStageName = STAGE_NAMES[nextStageId] || "";
      }
    } else {
      stageObj.status = "active";
    }
  }

  // 7. Update Project Details & Scope
  presale.projectDetails.engagementScope = effectiveScope;
  presale.projectDetails.totalStages = maxAllowedStage;
  presale.projectDetails.completedStages = presale.stages.filter((s) => s.status === "completed").length;

  if (projectStatus) presale.projectDetails.projectStatus = projectStatus;
  if (projectSubStatus) presale.projectDetails.projectSubStatus = projectSubStatus;
  if (activePerson) presale.projectDetails.currentActivePerson = activePerson;

  // 8. Audit History Snapshot (Saved with exact Date + Time, savedBy, snapshot)
  presale.updatedBy = currentUserId;
  presale.updatedByName = currentUserName;

  presale.stageHistory.push({
    stageId,
    stageName: STAGE_NAMES[stageId],
    action: historyAction,
    savedBy: currentUserId,
    savedByName: currentUserName,
    savedAt: new Date(),
    stageSnapshot: stageData
  });

  presale.markModified("stages");
  presale.markModified("projectDetails");
  await presale.save();

  // 9. Sync changes with LeadProject for backward compatibility
  try {
    const stagesDataMap = {};
    presale.stages.forEach((s) => {
      stagesDataMap[s.stageId] = s.data || {};
    });

    await LeadProject.findByIdAndUpdate(projectId, {
      $set: {
        stagesData: stagesDataMap,
        currentStageId: presale.projectDetails.currentStageId,
        projectStatus: presale.projectDetails.projectStatus,
        projectSubStatus: presale.projectDetails.projectSubStatus,
        businessType: effectiveScope
      }
    });
  } catch (syncErr) {
    console.error("Warning: LeadProject sync error:", syncErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      presale,
      isRejected
        ? `Presale marked as Closed at Stage ${stageId} (${acceptanceStatus})`
        : `Stage ${stageId} (${STAGE_NAMES[stageId]}) saved successfully!`
    )
  );
});

/**
 * 3. ADD DISCUSSION REMARK WITH CLOUDINARY ATTACHMENTS
 * POST /api/v1/presales/:projectId/remark
 */
export const addPresaleRemarkWithCloudinary = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { text, author, stageId, stageName } = req.body;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid Project ID is required");
  }

  let presale = await Presale.findOne({ "projectDetails.projectId": projectId });
  if (!presale) {
    const project = await LeadProject.findById(projectId);
    if (!project) {
      throw new ApiError(404, "Lead Project not found");
    }

    const scope = project.businessType || "Design + Construction";
    const initialStages = [];
    for (let i = 1; i <= 11; i++) {
      initialStages.push({
        stageId: i,
        stageName: STAGE_NAMES[i],
        status: i === 1 ? "active" : "pending",
        data: {}
      });
    }

    presale = await Presale.create({
      projectDetails: {
        projectId: project._id,
        leadId: project.leadId,
        clientName: project.clientName,
        phoneNumber: project.phoneNumber,
        projectName: project.projectName || project.workCategory || "",
        currentActivePerson: project.nextPersonName || project.projectCoordinatorName || "Admin",
        engagementScope: scope,
        totalStages: getMaxStageForScope(scope),
        currentStageId: 1,
        currentStageName: STAGE_NAMES[1],
        projectStatus: "On Track",
        projectSubStatus: "VISIT"
      },
      stages: initialStages,
      stageHistory: [],
      remarks: [],
      presaleStatus: "In Progress",
      createdBy: req.user?._id || null,
      createdByName: req.user?.name || "Admin",
      updatedBy: req.user?._id || null,
      updatedByName: req.user?.name || "Admin"
    });
  }

  const attachments = [];

  // Upload any incoming multipart files to Cloudinary
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const cloudinaryResult = await uploadOnCloudinary(file.path);
      if (cloudinaryResult?.secure_url) {
        const mime = file.mimetype || "";
        const isAudio =
          mime.startsWith("audio/") ||
          file.originalname.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i);
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");

        let fileType = "document";
        if (isAudio) fileType = "audio";
        else if (isImage) fileType = "image";
        else if (isVideo) fileType = "video";

        attachments.push({
          name: file.originalname || "attachment",
          type: fileType,
          url: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id || "",
          size: file.size || 0
        });
      }
    }
  }

  // Support direct attachment JSON if provided
  if (req.body.attachments) {
    try {
      const parsed = typeof req.body.attachments === "string" ? JSON.parse(req.body.attachments) : req.body.attachments;
      if (Array.isArray(parsed)) {
        parsed.forEach((att) => {
          if (att?.url && !attachments.some((a) => a.url === att.url)) {
            attachments.push(att);
          }
        });
      }
    } catch (_) {}
  }

  const currentUserId = req.user?._id || null;
  const currentUserName = req.user?.name || author || "Admin";
  const targetStageId = Number(stageId) || presale.projectDetails.currentStageId || 1;
  const targetStageName = stageName || STAGE_NAMES[targetStageId] || `Stage ${targetStageId}`;

  const newRemark = {
    stageId: targetStageId,
    stageName: targetStageName,
    author: currentUserName,
    userId: currentUserId,
    text: text ? text.trim() : "",
    attachments,
    dateTime: new Date() // Exact Date + Time
  };

  presale.remarks.unshift(newRemark);
  presale.updatedBy = currentUserId;
  presale.updatedByName = currentUserName;

  await presale.save();

  // Sync remarks back to LeadProject
  try {
    await LeadProject.findByIdAndUpdate(projectId, {
      $set: { remarks: presale.remarks }
    });
  } catch (syncErr) {
    console.error("Warning: LeadProject remarks sync error:", syncErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { newRemark, allRemarks: presale.remarks },
      "Remark & attachments uploaded successfully"
    )
  );
});

/**
 * 4. CLOSE PRESALE AT ANY STAGE WITH REASON, REMARKS & CLOUDINARY MEDIA
 * POST /api/v1/presales/:projectId/close
 */
export const closePresale = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    closureReason = "Lost",
    closureRemark = "",
    stageId = 1,
    stageName = "Visit",
    author = "Admin"
  } = req.body;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid Project ID is required");
  }

  let presale = await Presale.findOne({ "projectDetails.projectId": projectId });
  if (!presale) {
    throw new ApiError(404, "Presale record not found");
  }

  const currentUserId = req.user?._id || null;
  const currentUserName = req.user?.name || author || "Admin";
  const numericStageId = Number(stageId) || presale.projectDetails.currentStageId || 1;
  const targetStageName = stageName || STAGE_NAMES[numericStageId] || `Stage ${numericStageId}`;

  const attachments = [];

  // Upload any incoming multipart files (audio recording, images, screenshot) to Cloudinary
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const cloudinaryResult = await uploadOnCloudinary(file.path);
      if (cloudinaryResult?.secure_url) {
        const mime = file.mimetype || "";
        const isAudio =
          mime.startsWith("audio/") ||
          file.originalname.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i);
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");

        let fileType = "document";
        if (isAudio) fileType = "audio";
        else if (isImage) fileType = "image";
        else if (isVideo) fileType = "video";

        attachments.push({
          name: file.originalname || "attachment",
          type: fileType,
          url: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id || "",
          size: file.size || 0
        });
      }
    }
  }

  // Update Presale Status
  const fullClosureText = `${closureReason}${closureRemark.trim() ? " — " + closureRemark.trim() : ""}`;
  presale.presaleStatus = "Closed";
  presale.closureReason = fullClosureText;
  presale.closedAtStage = numericStageId;
  presale.updatedBy = currentUserId;
  presale.updatedByName = currentUserName;

  // Mark the specific stage status as rejected/closed
  const targetStage = presale.stages.find((s) => s.stageId === numericStageId);
  if (targetStage) {
    targetStage.status = "rejected";
    targetStage.updatedAt = new Date();
  }

  // Push audit history
  presale.stageHistory.push({
    stageId: numericStageId,
    stageName: targetStageName,
    action: "closed_here",
    savedBy: currentUserId,
    savedByName: currentUserName,
    savedAt: new Date(),
    stageSnapshot: {
      closureReason,
      closureRemark,
      attachments
    }
  });

  // Log in Remarks / Discussion timeline with red CLOSED badge
  const newRemark = {
    stageId: numericStageId,
    stageName: targetStageName,
    author: currentUserName,
    userId: currentUserId,
    text: `🔴 [LEAD CLOSED AT STAGE ${numericStageId} (${targetStageName})]: ${fullClosureText}`,
    attachments,
    dateTime: new Date()
  };

  presale.remarks.unshift(newRemark);

  presale.markModified("stages");
  presale.markModified("projectDetails");
  await presale.save();

  // Sync to LeadProject
  try {
    await LeadProject.findByIdAndUpdate(projectId, {
      $set: {
        status: "CLOSED",
        closureStatus: closureReason,
        closureRemark: closureRemark,
        remarks: presale.remarks
      }
    });
  } catch (syncErr) {
    console.error("Warning: LeadProject sync error on close:", syncErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { presale, newRemark },
      `Lead marked as Closed at Stage ${numericStageId} successfully`
    )
  );
});
