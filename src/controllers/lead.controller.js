import { Lead } from "../models/lead.model.js";
import { LeadTransfer } from "../models/leadTransfer.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getISTDateString, recordLeadAction } from "../utils/dateHelper.js";

export const createLead = asyncHandler(async (req, res) => {
  const {
    clientName,
    phoneNumber,
    phone,
    emailAddress,
    email,
    date,
    leadMode,
    leadType,
    workCategory,
    workType,
    leadStatus,
    status,
    alternateNumber,
    address,
    city,
    pincode,
    state,
    expectedBusiness,
    budget,
    projectDetail,
    remark,
    remarkAttachments,
    notes,
    leadSource,
    channel,
    jobType,
    clientType,
    clientDesignation,
    leadLabel,
    whatsappNumber,
    googleLocation,
    salesPerson,
    requirement,
    assignedTo
  } = req.body;

  const name = clientName || req.body.concernPersonName;
  const mobile = phoneNumber || phone || whatsappNumber;

  if (!name || !mobile) {
    throw new ApiError(400, "Client name and phone number are required");
  }

  const lead = await Lead.create({
    clientName: name,
    phoneNumber: mobile,
    phone: mobile,
    emailAddress: emailAddress || email || "",
    email: emailAddress || email || "",
    date: date || getISTDateString(),
    leadMode: leadMode || leadSource || "DIRECT",
    leadType: leadType || "FRESH",
    workCategory: workCategory || "Design",
    workType: Array.isArray(workType) ? workType : (workType ? [workType] : []),
    leadStatus: leadStatus || status || "Warm",
    status: leadStatus || status || "Warm",
    alternateNumber: alternateNumber || "",
    address: address || "",
    city: city || "",
    pincode: pincode || "",
    state: state || "",
    expectedBusiness: Number(expectedBusiness || budget) || 0,
    budget: Number(expectedBusiness || budget) || 0,
    projectDetail: projectDetail || "",
    remark: remark || requirement || notes || "",
    notes: remark || projectDetail || notes || "",
    remarkAttachments: remarkAttachments || [],
    leadSource: leadSource || leadMode || "DIRECT",
    channel: channel || "Sales",
    jobType: jobType || "NEW",
    clientType: clientType || "Individual",
    clientDesignation: clientDesignation || "",
    leadLabel: leadLabel || (leadStatus || "Warm").toUpperCase(),
    whatsappNumber: whatsappNumber || mobile,
    googleLocation: googleLocation || "",
    salesPerson: salesPerson || "Sales TL (Current User)",
    requirement: requirement || remark || "",
    assignedTo: assignedTo || req.user?._id || null,
    createdBy: req.user?._id || null
  });

  recordLeadAction(lead, "LEAD_CREATED", "Lead registered in system", remark || requirement || "Initial creation", req.user?.name || "System");
  await lead.save();

  return res
    .status(201)
    .json(new ApiResponse(201, lead, "Lead created successfully"));
});

export const getAllLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    assignedTo,
    search
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;

  // Sales Executives can only view assigned leads unless they are ADMIN / MANAGER
  if (req.user?.role === "SALES_EXECUTIVE") {
    query.assignedTo = req.user._id;
  } else if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  if (search) {
    query.$or = [
      { clientName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const leads = await Lead.find(query)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Lead.countDocuments(query);

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
      "Leads fetched successfully"
    )
  );
});

export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await Lead.findById(id)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email");

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead details retrieved successfully"));
});

export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  Object.assign(lead, req.body);
  recordLeadAction(lead, "LEAD_UPDATED", "Lead details updated", req.body.remark || req.body.requirement || "Lead updated", req.user?.name || "System");
  await lead.save();

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead updated successfully"));
});

export const assignLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newAssignedToId, salesPerson, assignTo, reason } = req.body;

  const assigneeName = salesPerson || assignTo;
  const targetId = newAssignedToId;

  if (!targetId && !assigneeName) {
    throw new ApiError(400, "Target User ID (newAssignedToId) or Sales Person is required");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const previousAssignedTo = lead.assignedTo;
  if (targetId) {
    lead.assignedTo = targetId;
  }
  if (assigneeName) {
    lead.salesPerson = assigneeName;
  }

  recordLeadAction(lead, "LEAD_ASSIGNED", `Assigned to ${assigneeName || targetId}`, reason || `Reassigned to ${assigneeName || targetId}`, req.user?.name || "System");
  await lead.save();

  await LeadTransfer.create({
    lead: lead._id,
    transferredFrom: previousAssignedTo || null,
    transferredTo: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null,
    reason: reason || `Assigned to ${assigneeName || targetId}`,
    transferredBy: req.user?._id || null
  });

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead assigned successfully"));
});

export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remark, reason } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  lead.status = status;
  lead.leadStatus = status;
  lead.leadLabel = status.toUpperCase();

  recordLeadAction(lead, "STATUS_CHANGED", `Status updated to ${status}`, remark || reason || `Status set to ${status}`, req.user?.name || "System");
  await lead.save();

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead status updated successfully"));
});

export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await Lead.findByIdAndDelete(id);

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Lead deleted successfully"));
});
