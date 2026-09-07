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
    workCategory: workCategory || "Design",
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
    limit = 20,
    search,
    leadStatus,
    leadMode,
    leadType,
    workCategory,
    leadBy,
    intrestedFromTableLead,
    sortBy = "createdAt",
    sortOrder = "desc"
  } = req.query;

  const query = { isDeleted: false };

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
  if (req.query.intrestedStatus) {
    query.intrestedStatus = req.query.intrestedStatus;
  }
  if (intrestedFromTableLead !== undefined) {
    query.intrestedFromTableLead =
      intrestedFromTableLead === "true" || intrestedFromTableLead === true;
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
      .populate("statusTimeline.changedBy", "name email"),
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

  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id, isDeleted: false }
    : { leadId: id.toUpperCase(), isDeleted: false };

  const lead = await Lead.findOne(query)
    .populate("leadBy", "name email phone")
    .populate("intrestedFromTableLeadBy", "name email")
    .populate("statusTimeline.changedBy", "name email");

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
  const lead = await Lead.findById(id);

  if (!lead || lead.isDeleted) {
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

  // WorkType array handling
  if (req.body.workType && typeof req.body.workType === "string") {
    try {
      req.body.workType = JSON.parse(req.body.workType);
    } catch {
      req.body.workType = req.body.workType.split(",").map((s) => s.trim()).filter(Boolean);
    }
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
  if (!lead || lead.isDeleted) {
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

  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id, isDeleted: false }
    : { leadId: id.toUpperCase(), isDeleted: false };

  const lead = await Lead.findOne(query);
  if (!lead || lead.isDeleted) {
    throw new ApiError(404, "Lead not found");
  }

  const isInterested = intrestedFromTableLead === true || intrestedFromTableLead === "true";

  if (isInterested) {
    // 1. Condition: Mark as Interested -> Activate in Lead Management
    lead.intrestedFromTableLead = true;
    lead.intrestedStatus = "Intrested";
    lead.intrestedFromTableLeadBy = req.user?._id || req.body.userId || null;
    lead.intrestedFromTableLeadAt = new Date();
    lead.inLeadManagement = true;
    lead.isLoss = false;
    lead.leadStatus = "Hot";
  } else {
    // 2. Condition: Mark as Not Interested -> Move to Lost Leads
    lead.intrestedFromTableLead = false;
    lead.intrestedStatus = "Not Intersted";
    lead.intrestedFromTableLeadBy = req.user?._id || req.body.userId || null;
    lead.intrestedFromTableLeadAt = new Date();
    lead.leadStatus = "Cold";

    const reason = lossReason || "Client Not Interested";
    const remark = lossRemark || "";
    if (remark) {
      lead.remarks = `Reason: ${reason} | Remark: ${remark}`;
    } else {
      lead.remarks = `Reason: ${reason}`;
    }

    if (!Array.isArray(lead.statusTimeline)) {
      lead.statusTimeline = [];
    }
    lead.statusTimeline.push({
      status: "Cold",
      changedBy: req.user?._id || req.body.userId || null,
      changedAt: new Date(),
      remarks: remark ? `[Not Interested] Reason: ${reason} | Remark: ${remark}` : `[Not Interested] Reason: ${reason}`
    });
  }

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("intrestedFromTableLeadBy", "name email phone");

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
  const lead = await Lead.findById(id);

  if (!lead || lead.isDeleted) {
    throw new ApiError(404, "Lead not found");
  }

  lead.isDeleted = true;
  await lead.save();

  return res.status(200).json(new ApiResponse(200, null, "Lead deleted successfully"));
});