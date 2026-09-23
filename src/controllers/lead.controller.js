import mongoose from "mongoose";
import { Lead } from "../models/lead.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper: 4-digit Unique Lead ID generator
const generateLeadId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "LD-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ============================================
// 1. CREATE LEAD
// ============================================
export const createLead = asyncHandler(async (req, res) => {
  const {
    leadId,
    date,
    leadMode,
    leadType,
    workCategory,
    workType,
    leadStatus = "Warm",
    intrestedStatus = "Pending",
    clientName,
    phoneNumber,
    alternateNumber,
    emailAddress,
    address,
    city,
    pincode,
    state,
    expectedBusiness,
    projectDetail,
    remarks,
    leadBy: customLeadBy
  } = req.body;

  // Basic Validation
  if (!clientName || !clientName.trim()) {
    throw new ApiError(400, "Client Name is required");
  }
  if (!phoneNumber || !phoneNumber.trim()) {
    throw new ApiError(400, "Phone Number is required");
  }
  if (!address || !address.trim()) {
    throw new ApiError(400, "Address is required");
  }
  if (!city || !city.trim()) {
    throw new ApiError(400, "City is required");
  }
  if (!pincode || !pincode.trim()) {
    throw new ApiError(400, "Pincode is required");
  }
  if (!state || !state.trim()) {
    throw new ApiError(400, "State is required");
  }

  // Work Category formatting
  let parsedWorkCategory = [];
  if (Array.isArray(workCategory)) {
    parsedWorkCategory = workCategory;
  } else if (typeof workCategory === "string") {
    try {
      parsedWorkCategory = JSON.parse(workCategory);
    } catch {
      parsedWorkCategory = workCategory.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(parsedWorkCategory) || parsedWorkCategory.length === 0) {
    parsedWorkCategory = workCategory ? [workCategory] : ["Design"];
  }

  // Work Type formatting
  let parsedWorkType = [];
  if (Array.isArray(workType)) {
    parsedWorkType = workType;
  } else if (typeof workType === "string") {
    try {
      parsedWorkType = JSON.parse(workType);
    } catch {
      parsedWorkType = workType.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Remarks text (supports both 'remarks' and 'remark')
  const remarksText = (remarks || req.body.remark || "").trim();

  // Helper to extract file type
  const detectFileType = (file) => {
    const mime = file?.mimetype || "";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return "document";
  };

  // Collect all uploaded files from req.files or req.file
  const uploadedFilesList = [];
  if (req.files) {
    if (Array.isArray(req.files.remarksFiles)) {
      uploadedFilesList.push(...req.files.remarksFiles);
    }
    if (Array.isArray(req.files.remarksFile)) {
      uploadedFilesList.push(...req.files.remarksFile);
    }
  } else if (req.file) {
    uploadedFilesList.push(req.file);
  }

  // Upload each file to Cloudinary
  const remarksFilesData = [];
  let primaryRemarksFileUrl = "";

  for (const f of uploadedFilesList) {
    try {
      const uploadResult = await uploadOnCloudinary(f.path);
      if (uploadResult?.secure_url) {
        remarksFilesData.push({
          url: uploadResult.secure_url,
          fileType: detectFileType(f),
          name: f.originalname || "attachment",
          size: f.size || 0
        });
        if (!primaryRemarksFileUrl) {
          primaryRemarksFileUrl = uploadResult.secure_url;
        }
      }
    } catch (uploadErr) {
      console.error("Failed to upload remarks file to Cloudinary:", uploadErr);
    }
  }

  // Fallback if URL string passed in body
  if (!primaryRemarksFileUrl && req.body.remarksFile) {
    primaryRemarksFileUrl = req.body.remarksFile;
  }

  // User ID kon bana raha hai (JWT req.user ya body)
  const currentUserId = req.user?._id || customLeadBy || null;

  // Unique Lead ID
  const finalLeadId = leadId || generateLeadId();

  // Initial Status Timeline Entry
  const initialTimeline = [
    {
      status: leadStatus,
      changedBy: currentUserId,
      changedAt: new Date(),
      remarks: remarksText || "Lead registered"
    }
  ];

  const lead = await Lead.create({
    leadId: finalLeadId,
    date: date ? new Date(date) : new Date(),
    leadMode: leadMode || "By Sales Team",
    leadType: leadType || "FRESH",
    workCategory: parsedWorkCategory,
    workType: parsedWorkType,
    leadStatus,
    intrestedStatus: intrestedStatus || "Pending",
    clientName: clientName.trim(),
    phoneNumber: phoneNumber.trim(),
    alternateNumber: alternateNumber?.trim() || "",
    emailAddress: emailAddress?.trim().toLowerCase() || "",
    address: address.trim(),
    city: city.trim(),
    pincode: pincode.trim(),
    state: state.trim(),
    expectedBusiness: Number(expectedBusiness) || 0,
    projectDetail: projectDetail?.trim() || "",
    remarks: remarksText,
    remarksFile: primaryRemarksFileUrl,
    remarksFiles: remarksFilesData,
    leadBy: currentUserId,
    intrestedFromTableLead: false,
    isDeleted: 0,
    statusTimeline: initialTimeline
  });

  const createdLead = await Lead.findById(lead._id)
    .populate("leadBy", "name email phone");

  return res
    .status(201)
    .json(new ApiResponse(201, createdLead, "Lead created successfully"));
});

// ============================================
// 2. GET ALL LEADS (Search, Filter, Pagination)
// ============================================
export const getAllLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    leadStatus,
    leadMode,
    leadType,
    workCategory,
    leadBy,
    intrestedStatus,
    intrestedFromTableLead,
    sortBy = "createdAt",
    sortOrder = "desc"
  } = req.query;

  const query = { isDeleted: { $nin: [1, true, "1"] }, isActive: true };

  // Search filter
  if (search) {
    query.$or = [
      { clientName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { emailAddress: { $regex: search, $options: "i" } },
      { leadId: { $regex: search, $options: "i" } }
    ];
  }

  // Filters
  if (leadStatus) query.leadStatus = leadStatus;
  if (req.query.status && !leadStatus) query.leadStatus = req.query.status;
  if (leadMode) query.leadMode = leadMode;
  if (leadType) query.leadType = leadType;
  if (workCategory) query.workCategory = workCategory;
  if (req.query.city && req.query.city !== "ALL") query.city = { $regex: req.query.city, $options: "i" };
  if (req.query.state && req.query.state !== "ALL") query.state = { $regex: req.query.state, $options: "i" };
  if (leadBy) query.leadBy = leadBy;

  // Filter by interested status (e.g., intrestedStatus="Pending")
  if (req.query.intrestedStatus) {
    query.intrestedStatus = req.query.intrestedStatus;
  }

  // Filter by intrestedFromTableLead (e.g., intrestedFromTableLead=false / true)
  if (req.query.intrestedFromTableLead !== undefined) {
    const isValTrue =
      req.query.intrestedFromTableLead === true ||
      req.query.intrestedFromTableLead === "true";
    if (isValTrue) {
      query.intrestedFromTableLead = true;
    } else {
      query.intrestedFromTableLead = { $ne: true };
    }
  }

  // Filter by isPending (Lead Management pending sales transfer)
  if (req.query.isPending === "true" || req.query.isPending === true) {
    query.leadStatus = { $ne: "INTERESTED" };
    query.inSalesManagement = { $ne: true };
  }

  // Filter by inSalesManagement (Sales Management sheet)
  if (req.query.inSalesManagement !== undefined) {
    const isSalesVal =
      req.query.inSalesManagement === true ||
      req.query.inSalesManagement === "true";
    query.inSalesManagement = isSalesVal ? true : { $ne: true };
  }

  // Fallback for view="totalLeads" if params not explicitly specified
  if (
    (req.query.view === "totalLeads" || req.query.isTotalLeads === "true") &&
    !req.query.intrestedStatus &&
    req.query.intrestedFromTableLead === undefined
  ) {
    query.intrestedStatus = "Pending";
    query.intrestedFromTableLead = { $ne: true };
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [leads, totalCount] = await Promise.all([
    Lead.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(limitNum)
      .populate("leadBy", "name email phone")
      .populate("intrestedFromTableLeadBy", "name email")
      .populate("statusTimeline.changedBy", "name email")
      .populate({
        path: "followups.createdBy",
        select: "name email role departments branch",
        populate: { path: "departments", select: "name" }
      }),
    Lead.countDocuments(query)
  ]);

  const formattedLeads = leads.map((leadDoc) => {
    const obj = leadDoc.toObject ? leadDoc.toObject() : { ...leadDoc };
    if (obj.intrestedStatus === "Not Intersted" && obj.remarks) {
      const remText = obj.remarks;
      const reasonMatch = remText.match(/Reason:\s*([^|]+)/i);
      const remarkMatch = remText.match(/Remark:\s*(.+)/i);
      if (reasonMatch) {
        const rawReason = reasonMatch[1].trim();
        if (!remarkMatch && rawReason.includes(" - ")) {
          const parts = rawReason.split(" - ");
          obj.lossReason = parts[0].trim();
          obj.lossRemark = parts.slice(1).join(" - ").trim();
        } else {
          obj.lossReason = rawReason;
          if (remarkMatch) {
            obj.lossRemark = remarkMatch[1].trim();
          }
        }
      } else {
        obj.lossReason = "Client Not Interested";
        obj.lossRemark = remText;
      }
    }
    return obj;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leads: formattedLeads,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      },
      "Leads fetched successfully"
    )
  );
});

// ============================================
// 3. GET LEAD BY ID (or custom leadId)
// ============================================
export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notDeleted = { $nin: [1, true, "1"] };
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id, isDeleted: notDeleted }
    : { leadId: id.toUpperCase(), isDeleted: notDeleted };

  const lead = await Lead.findOne(query)
    .populate("leadBy", "name email phone")
    .populate("intrestedFromTableLeadBy", "name email")
    .populate("statusTimeline.changedBy", "name email")
    .populate({
      path: "followups.createdBy",
      select: "name email role departments branch",
      populate: { path: "departments", select: "name" }
    });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  return res.status(200).json(new ApiResponse(200, lead, "Lead details fetched successfully"));
});

// ============================================
// 4. UPDATE LEAD
// ============================================
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notDeleted = { $nin: [1, true, "1"] };
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id, isDeleted: notDeleted }
    : { leadId: id.toUpperCase(), isDeleted: notDeleted };

  const lead = await Lead.findOne(query);

  if (!lead || lead.isDeleted === 1 || lead.isDeleted === true || lead.isDeleted === "1") {
    throw new ApiError(404, "Lead not found");
  }

  // Handle remarks file(s) upload
  const updateFilesList = [];
  if (req.files) {
    if (Array.isArray(req.files.remarksFiles)) updateFilesList.push(...req.files.remarksFiles);
    if (Array.isArray(req.files.remarksFile)) updateFilesList.push(...req.files.remarksFile);
  } else if (req.file) {
    updateFilesList.push(req.file);
  }

  if (updateFilesList.length > 0) {
    lead.remarksFiles = lead.remarksFiles || [];
    for (const f of updateFilesList) {
      try {
        const uploadResult = await uploadOnCloudinary(f.path);
        if (uploadResult?.secure_url) {
          const mime = f?.mimetype || "";
          const fType = mime.startsWith("image/") ? "image" : mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "document";
          lead.remarksFiles.push({
            url: uploadResult.secure_url,
            fileType: fType,
            name: f.originalname || "attachment",
            size: f.size || 0
          });
          if (!lead.remarksFile) {
            lead.remarksFile = uploadResult.secure_url;
          }
        }
      } catch (err) {
        console.error("Cloudinary upload error in updateLead:", err);
      }
    }
  }

  if (req.body.remark && !req.body.remarks) {
    req.body.remarks = req.body.remark;
  }
  if (req.body.remarks) {
    lead.remarks = req.body.remarks;
  }

  // WorkCategory array handling
  if (req.body.workCategory && typeof req.body.workCategory === "string") {
    try {
      req.body.workCategory = JSON.parse(req.body.workCategory);
    } catch {
      req.body.workCategory = req.body.workCategory.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // WorkType array handling
  if (req.body.workType && typeof req.body.workType === "string") {
    try {
      req.body.workType = JSON.parse(req.body.workType);
    } catch {
      req.body.workType = req.body.workType.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Safe boolean parsing from multipart/form-data
  if (req.body.inSalesManagement !== undefined) {
    lead.inSalesManagement = req.body.inSalesManagement === true || req.body.inSalesManagement === "true";
    delete req.body.inSalesManagement;
  }
  if (req.body.isSalesTransferred !== undefined) {
    lead.isSalesTransferred = req.body.isSalesTransferred === true || req.body.isSalesTransferred === "true";
    delete req.body.isSalesTransferred;
  }

  // Avoid overwriting uploaded remarksFiles with stringified body keys
  delete req.body.remarksFiles;
  delete req.body.remarksFile;

  // Delete immutable/system fields to prevent Mongoose errors
  delete req.body._id;
  delete req.body.id;
  delete req.body.leadId;
  delete req.body.createdAt;
  delete req.body.updatedAt;
  delete req.body.__v;
  delete req.body.statusTimeline;
  delete req.body.followups;

  // Sanitize leadBy (Mongoose ObjectId ref)
  if (req.body.leadBy !== undefined) {
    if (typeof req.body.leadBy === "object" && req.body.leadBy?._id) {
      req.body.leadBy = req.body.leadBy._id;
    } else if (typeof req.body.leadBy === "string" && req.body.leadBy.match(/^[0-9a-fA-F]{24}$/)) {
      // valid 24-char ObjectId
    } else {
      delete req.body.leadBy;
    }
  }

  // Sanitize intrestedFromTableLeadBy
  if (req.body.intrestedFromTableLeadBy !== undefined) {
    if (typeof req.body.intrestedFromTableLeadBy === "object" && req.body.intrestedFromTableLeadBy?._id) {
      req.body.intrestedFromTableLeadBy = req.body.intrestedFromTableLeadBy._id;
    } else if (typeof req.body.intrestedFromTableLeadBy === "string" && req.body.intrestedFromTableLeadBy.match(/^[0-9a-fA-F]{24}$/)) {
      // valid
    } else {
      delete req.body.intrestedFromTableLeadBy;
    }
  }

  // Sanitize expectedBusiness
  if (req.body.expectedBusiness !== undefined) {
    req.body.expectedBusiness = Number(req.body.expectedBusiness) || 0;
  }

  // Sanitize date
  if (req.body.date) {
    const parsedDate = new Date(req.body.date);
    if (!isNaN(parsedDate.getTime())) {
      req.body.date = parsedDate;
    } else {
      delete req.body.date;
    }
  }

  // Normalize leadStatus
  if (req.body.leadStatus && typeof req.body.leadStatus === "string") {
    const st = req.body.leadStatus.trim();
    if (st.toLowerCase() === "hot") req.body.leadStatus = "Hot";
    else if (st.toLowerCase() === "warm") req.body.leadStatus = "Warm";
    else if (st.toLowerCase() === "cold") req.body.leadStatus = "Cold";
    else if (st.toUpperCase() === "INTERESTED") req.body.leadStatus = "INTERESTED";
    else if (st.toUpperCase() === "LOST") req.body.leadStatus = "LOST";
  }

  // Agar leadStatus badla hai toh statusTimeline me push karo
  if (req.body.leadStatus && req.body.leadStatus !== lead.leadStatus) {
    lead.statusTimeline.push({
      status: req.body.leadStatus,
      changedBy: req.user?._id || null,
      changedAt: new Date(),
      remarks: req.body.timelineRemarks || req.body.remarks || `Status changed to ${req.body.leadStatus}`
    });
  }

  Object.assign(lead, req.body);
  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("leadBy", "name email phone")
    .populate("statusTimeline.changedBy", "name email");

  return res.status(200).json(new ApiResponse(200, updatedLead, "Lead updated successfully"));
});

// ============================================
// 5. UPDATE LEAD STATUS
// ============================================
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks = "" } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const lead = await Lead.findById(id);
  if (!lead || lead.isDeleted === 1 || lead.isDeleted === true || lead.isDeleted === "1") {
    throw new ApiError(404, "Lead not found");
  }

  lead.leadStatus = status;
  lead.statusTimeline.push({
    status,
    changedBy: req.user?._id || null,
    changedAt: new Date(),
    remarks: remarks || `Status updated to ${status}`
  });

  await lead.save();

  return res.status(200).json(new ApiResponse(200, lead, "Lead status updated successfully"));
});

// ============================================
// 6. TOGGLE INTERESTED FROM TABLE LEAD
// ============================================
export const markInterestedFromTable = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { intrestedFromTableLead, lossReason, lossRemark } = req.body;

  const notDeleted = { $nin: [1, true, "1"] };
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id, isDeleted: notDeleted }
    : { leadId: id.toUpperCase(), isDeleted: notDeleted };

  const lead = await Lead.findOne(query);
  if (!lead || lead.isDeleted === 1 || lead.isDeleted === true || lead.isDeleted === "1") {
    throw new ApiError(404, "Lead not found");
  }

  const isInterested = intrestedFromTableLead === true || intrestedFromTableLead === "true";
  const userId = req.user?._id || req.body.userId || null;

  if (!Array.isArray(lead.statusTimeline)) {
    lead.statusTimeline = [];
  }

  if (isInterested) {
    // 1. Condition: Mark as Interested -> Activate in Lead Management
    lead.intrestedFromTableLead = true;
    lead.intrestedStatus = "Intrested";
    lead.intrestedFromTableLeadBy = userId;
    lead.intrestedFromTableLeadAt = new Date();
    lead.inLeadManagement = true;
    lead.isLoss = false;
    lead.lossReason = "";
    lead.lossRemark = "";
    // Note: leadStatus (Hot/Warm/Cold) is not changed as per requirement

    lead.statusTimeline.push({
      status: "Interested",
      changedBy: userId,
      changedAt: new Date(),
      remarks: "Marked as Interested from Table"
    });
  } else {
    // 2. Condition: Mark as Not Interested -> Move to Lost Leads
    lead.intrestedFromTableLead = false;
    lead.intrestedStatus = "Not Intersted";
    lead.intrestedFromTableLeadBy = userId;
    lead.intrestedFromTableLeadAt = new Date();
    lead.inLeadManagement = false;
    lead.isLoss = true;
    // Note: leadStatus (Hot/Warm/Cold) is not changed as per requirement

    const reason = lossReason || "Client Not Interested";
    const remark = lossRemark || "";
    lead.lossReason = reason;
    lead.lossRemark = remark;

    if (remark) {
      lead.remarks = `Reason: ${reason} | Remark: ${remark}`;
    } else {
      lead.remarks = `Reason: ${reason}`;
    }

    lead.statusTimeline.push({
      status: "Not Interested",
      changedBy: userId,
      changedAt: new Date(),
      remarks: remark ? `Reason: ${reason} | Remark: ${remark}` : `Reason: ${reason}`
    });
  }

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("intrestedFromTableLeadBy", "name email phone")
    .populate("statusTimeline.changedBy", "name email");

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedLead,
      isInterested
        ? "Marked interested from total successfully"
        : "Marked not interested and moved to lost leads successfully"
    )
  );
});

// ============================================
// 7. SOFT DELETE LEAD
// ============================================
export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let lead = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    lead = await Lead.findById(id);
  }
  if (!lead) {
    lead = await Lead.findOne({
      $or: [{ leadId: id }, { leadId: String(id).toUpperCase() }]
    });
  }

  if (!lead || lead.isDeleted === 1 || lead.isDeleted === true || lead.isDeleted === "1") {
    throw new ApiError(404, "Lead not found");
  }

  lead.isDeleted = 1;
  await lead.save();

  return res.status(200).json(new ApiResponse(200, null, "Lead deleted successfully"));
});

// ============================================
// 8. ADD FOLLOW-UP TO LEAD (NEW SCHEMA WITH CLOUDINARY UPLOADS)
// ============================================
export const addLeadFollowup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let lead = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    lead = await Lead.findById(id);
  }
  if (!lead) {
    lead = await Lead.findOne({
      $or: [{ leadId: id }, { leadId: String(id).toUpperCase() }],
      isDeleted: { $ne: true }
    });
  }
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  // Parse body data (supports both JSON body and FormData with 'data' field)
  let bodyData = req.body;
  if (req.body.data) {
    try {
      bodyData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
    } catch {
      bodyData = req.body;
    }
  }

  const detectFileType = (file) => {
    const mime = file?.mimetype || "";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/") || mime.includes("webm") || mime.includes("wav") || mime.includes("ogg") || mime.includes("mp3")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return "document";
  };

  // Helper to filter out temporary client-side blob URLs and only keep real remote URLs
  const filterValidFiles = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter((item) => {
      const url = String(item?.url || "");
      return url.startsWith("http://") || url.startsWith("https://");
    });
  };

  // Base files list from payload (excluding any client-side blob: URLs)
  const currentDiscussionFiles = filterValidFiles(bodyData.currentDiscussion?.files);
  const nextDiscussionFiles = filterValidFiles(bodyData.nextDiscussion?.files);
  const followupRemarkFiles = filterValidFiles(bodyData.followupRemark?.files);

  // Upload any incoming physical files to Cloudinary
  if (req.files) {
    // 1. Current Discussion Files / Voice Notes
    if (Array.isArray(req.files.currentFiles)) {
      for (const f of req.files.currentFiles) {
        const up = await uploadOnCloudinary(f.path);
        if (up?.secure_url) {
          currentDiscussionFiles.push({
            url: up.secure_url,
            name: f.originalname || "audio-note.wav",
            fileType: detectFileType(f),
            size: f.size || 0
          });
        }
      }
    }
    // 2. Next Discussion Files / Voice Notes
    if (Array.isArray(req.files.nextFiles)) {
      for (const f of req.files.nextFiles) {
        const up = await uploadOnCloudinary(f.path);
        if (up?.secure_url) {
          nextDiscussionFiles.push({
            url: up.secure_url,
            name: f.originalname || "audio-note.wav",
            fileType: detectFileType(f),
            size: f.size || 0
          });
        }
      }
    }
    // 3. Remarks Files / Voice Notes
    if (Array.isArray(req.files.remarkFiles)) {
      for (const f of req.files.remarkFiles) {
        const up = await uploadOnCloudinary(f.path);
        if (up?.secure_url) {
          followupRemarkFiles.push({
            url: up.secure_url,
            name: f.originalname || "audio-note.wav",
            fileType: detectFileType(f),
            size: f.size || 0
          });
        }
      }
    }
  }

  // Parse dateTime safely from request
  let scheduledDateTime = null;
  const rawDate = bodyData.dateTime || bodyData.date;
  if (rawDate) {
    const timeStr = bodyData.time || "10:00 AM";
    const combined = new Date(`${rawDate} ${timeStr}`);
    if (!isNaN(combined.getTime())) {
      scheduledDateTime = combined;
    } else {
      const fallback = new Date(rawDate);
      scheduledDateTime = !isNaN(fallback.getTime()) ? fallback : null;
    }
  }

  // Matrix parsing
  let matrixData = bodyData.matrix || {};
  if (typeof matrixData === "string") {
    try {
      matrixData = JSON.parse(matrixData);
    } catch {}
  }

  // Build followup entry matching followupSchema
  const followupEntry = {
    type: bodyData.type || "Call",
    dateTime: scheduledDateTime,
    talkToPerson: bodyData.talkToPerson || bodyData.concernPersonName || lead.clientName || "",
    personDesignation: bodyData.personDesignation || bodyData.clientDesignation || "",
    currentDiscussion: {
      discussion: bodyData.currentDiscussion?.discussion || bodyData.notes || bodyData.discussionWithClient || "",
      files: currentDiscussionFiles
    },
    nextDiscussion: {
      nextDiscussion: bodyData.nextDiscussion?.nextDiscussion || bodyData.nextDiscussionTopic || "",
      files: nextDiscussionFiles
    },
    rating: Number(bodyData.rating !== undefined ? bodyData.rating : (bodyData.clientRating || 4)),
    matrix: {
      revenue: matrixData.revenue || bodyData.revenue || "",
      satisfaction: matrixData.satisfaction || bodyData.satisfaction || "",
      repeatPotential: matrixData.repeatPotential || bodyData.repeatPotential || "",
      complexity: matrixData.complexity || bodyData.complexity || "",
      engagement: matrixData.engagement || bodyData.engagement || "",
      positiveAttitude: matrixData.positiveAttitude || bodyData.positiveAttitude || ""
    },
    followupRemark: {
      remarks: bodyData.followupRemark?.remarks || bodyData.followupRemarks || "",
      files: followupRemarkFiles
    },
    createdBy: req.user?._id || req.body.createdBy || null
  };

  lead.followups = lead.followups || [];
  lead.followups.unshift(followupEntry);

  lead.inLeadManagement = true;

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("leadBy", "name email phone")
    .populate("statusTimeline.changedBy", "name email")
    .populate({
      path: "followups.createdBy",
      select: "name email role departments branch",
      populate: { path: "departments", select: "name" }
    });

  return res.status(200).json(
    new ApiResponse(200, { lead: updatedLead, followup: lead.followups[0] }, "Follow-up added successfully")
  );
});

// 9. Get Deleted Leads (Only leads where isDeleted === 1 / true)
export const getDeletedLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    sortBy = "updatedAt",
    sortOrder = "desc"
  } = req.query;

  const query = { isDeleted: { $in: [1, true, "1"] } };

  if (search) {
    query.$or = [
      { clientName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { emailAddress: { $regex: search, $options: "i" } },
      { leadId: { $regex: search, $options: "i" } }
    ];
  }

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("leadBy", "name email phone")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Lead.countDocuments(query)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leads,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      "Deleted leads fetched successfully"
    )
  );
});

// 10. Restore Deleted Lead (Sets isDeleted to 0)
export const restoreLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let lead = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    lead = await Lead.findById(id);
  }
  if (!lead) {
    lead = await Lead.findOne({
      $or: [{ leadId: id }, { leadId: String(id).toUpperCase() }]
    });
  }

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  lead.isDeleted = 0;
  await lead.save();

  return res.status(200).json(
    new ApiResponse(200, lead, "Lead restored successfully")
  );
});