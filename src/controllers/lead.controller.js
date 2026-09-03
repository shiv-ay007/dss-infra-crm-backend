import mongoose from "mongoose";
import { Lead } from "../models/lead.model.js";
import { LeadTransfer } from "../models/leadTransfer.model.js";
import { LossLead } from "../models/lossLead.model.js";
import { AssignedLead } from "../models/assignedLead.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getISTDateString, recordLeadAction, generateUniqueLeadId } from "../utils/dateHelper.js";

const findLeadByIdOrLeadId = async (idStr) => {
  if (!idStr) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(idStr);
  const query = isObjectId ? { $or: [{ _id: idStr }, { leadId: idStr }] } : { leadId: idStr };
  return await Lead.findOne(query);
};

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
    assignedTo,
    isLoss,
    lossReason,
    lossDate,
    lossRemark,
    isFollowup,
    followupTime,
    followupRemark,
    nextFollowupDate
  } = req.body;

  const name = clientName || req.body.concernPersonName;
  const mobile = phoneNumber || phone || whatsappNumber;

  if (!name || !mobile) {
    throw new ApiError(400, "Client name and phone number are required");
  }

  const newLeadId = req.body.leadId || (await generateUniqueLeadId(Lead));
  const finalStatus = leadStatus || status || "Warm";
  const isStatusLoss = ["LOSS", "LOST", "CLOSED_LOST", "LOSS LEADS"].includes(finalStatus.toUpperCase());

  const cleanPassedPerson = (salesPerson || req.body.assignTo || "").replace(" (Current User)", "").replace("(Current User)", "").trim();
  const explicitIsAssigned = Boolean((req.body.isAssigned === true || req.body.isAssigned === "true") && cleanPassedPerson && cleanPassedPerson !== "Unassigned");

  const lead = await Lead.create({
    leadId: newLeadId,
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
    leadStatus: finalStatus,
    status: finalStatus,
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
    leadLabel: leadLabel || finalStatus.toUpperCase(),
    whatsappNumber: whatsappNumber || mobile,
    googleLocation: googleLocation || "",
    salesPerson: explicitIsAssigned ? cleanPassedPerson : "",
    assignTo: explicitIsAssigned ? cleanPassedPerson : "",
    isAssigned: explicitIsAssigned,
    requirement: requirement || remark || "",
    assignedTo: explicitIsAssigned ? (assignedTo || req.user?._id || null) : null,
    createdBy: req.user?._id || null,
    isLoss: Boolean(isLoss || isStatusLoss),
    lossReason: lossReason || "",
    lossDate: lossDate || (isStatusLoss ? new Date() : null),
    lossRemark: lossRemark || "",
    isFollowup: Boolean(isFollowup || nextFollowupDate || followupRemark),
    followupTime: followupTime || "",
    followupRemark: followupRemark || "",
    nextFollowupDate: nextFollowupDate || null
  });

  if (isStatusLoss || isLoss) {
    await LossLead.create({
      lead: lead._id,
      leadId: lead.leadId,
      clientName: lead.clientName,
      phoneNumber: lead.phoneNumber,
      alternateNumber: lead.alternateNumber,
      emailAddress: lead.emailAddress,
      workCategory: lead.workCategory,
      workType: lead.workType,
      address: lead.address || address || "",
      city: lead.city || city || "",
      pincode: lead.pincode || pincode || "",
      state: lead.state || state || "",
      expectedBusiness: lead.expectedBusiness,
      budget: lead.budget,
      lossReason: lossReason || "Lead marked as loss",
      lossRemark: lossRemark || remark || "",
      lossDate: lossDate || new Date(),
      assignedTo: lead.assignedTo,
      createdBy: req.user?._id || null
    });
  }

  if (explicitIsAssigned && cleanPassedPerson) {
    await AssignedLead.create({
      lead: lead._id,
      leadId: lead.leadId,
      clientName: lead.clientName,
      phoneNumber: lead.phoneNumber,
      phone: lead.phoneNumber,
      alternateNumber: lead.alternateNumber,
      emailAddress: lead.emailAddress,
      email: lead.emailAddress,
      workCategory: lead.workCategory,
      workType: lead.workType,
      address: lead.address || address || "",
      city: lead.city || city || "",
      pincode: lead.pincode || pincode || "",
      state: lead.state || state || "",
      expectedBusiness: lead.expectedBusiness,
      budget: lead.budget,
      salesPerson: cleanPassedPerson,
      assignTo: cleanPassedPerson,
      assignedTo: lead.assignedTo,
      assignedBy: req.user?._id || null,
      assignedDate: new Date(),
      isAssigned: true,
      status: lead.leadStatus || "Warm",
      leadStatus: lead.leadStatus || "Warm",
      remark: remark || requirement || "",
      notes: remark || requirement || "",
      createdBy: req.user?._id || null
    });
  }

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
    salesPerson,
    search,
    isLoss,
    isFollowup,
    leadMode,
    leadType,
    workCategory,
    city,
    state
  } = req.query;

  const query = {};

  if (status && status !== "ALL") {
    query.$or = [
      { status: { $regex: new RegExp(`^${status}$`, "i") } },
      { leadStatus: { $regex: new RegExp(`^${status}$`, "i") } }
    ];
  }

  if (priority && priority !== "ALL") query.priority = priority;

  if (leadMode && leadMode !== "ALL") {
    query.leadMode = { $regex: new RegExp(`^${leadMode}$`, "i") };
  }

  if (leadType && leadType !== "ALL") {
    query.leadType = { $regex: new RegExp(`^${leadType}$`, "i") };
  }

  if (workCategory && workCategory !== "ALL") {
    query.workCategory = { $regex: new RegExp(`^${workCategory}$`, "i") };
  }

  if (city && city !== "ALL") {
    query.city = { $regex: new RegExp(`^${city}$`, "i") };
  }

  if (state && state !== "ALL") {
    query.state = { $regex: new RegExp(`^${state}$`, "i") };
  }

  if (salesPerson && salesPerson !== "ALL") {
    query.$or = [
      { salesPerson: { $regex: new RegExp(`^${salesPerson}$`, "i") } },
      { assignTo: { $regex: new RegExp(`^${salesPerson}$`, "i") } }
    ];
  }

  if (isLoss === "true" || isLoss === true) {
    query.isLoss = true;
  } else if (isLoss === "all") {
    // Return all leads regardless of loss status
  } else {
    // By default, exclude lost leads so they only appear in Lost Leads!
    query.isLoss = { $ne: true };
    if (!status || status === "ALL") {
      query.status = { $nin: ["CLOSED_LOST", "LOST", "closed_lost", "lost", "LOSS"] };
      query.leadStatus = { $nin: ["CLOSED_LOST", "LOST", "closed_lost", "lost", "LOSS"] };
    }
  }

  if (isFollowup !== undefined) {
    query.isFollowup = isFollowup === "true";
  }

  // Sales Executives can only view assigned leads unless they are ADMIN / MANAGER
  if (req.user?.role === "SALES_EXECUTIVE") {
    query.assignedTo = req.user._id;
  } else if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  if (search) {
    query.$or = [
      { leadId: { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { emailAddress: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { requirement: { $regex: search, $options: "i" } },
      { projectDetail: { $regex: search, $options: "i" } }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const leads = await Lead.find(query)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Backfill leadId if missing on any lead without heavy document overhead
  for (let l of leads) {
    if (!l.leadId) {
      const generated = await generateUniqueLeadId(Lead);
      await Lead.updateOne({ _id: l._id }, { $set: { leadId: generated } });
      l.leadId = generated;
    }
  }

  const total = await Lead.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leads,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      },
      "Leads fetched successfully"
    )
  );
});

export const getLossLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, assignedTo } = req.query;

  const leadQuery = {
    $or: [
      { isLoss: true },
      { status: { $regex: /loss|lost|closed_lost/i } },
      { leadStatus: { $regex: /loss|lost|closed_lost/i } },
      { leadLabel: { $regex: /loss|lost|closed_lost/i } }
    ]
  };
  const lossLeadQuery = {};

  if (req.user?.role === "SALES_EXECUTIVE") {
    leadQuery.assignedTo = req.user._id;
    lossLeadQuery.assignedTo = req.user._id;
  } else if (assignedTo) {
    leadQuery.assignedTo = assignedTo;
    lossLeadQuery.assignedTo = assignedTo;
  }

  if (search) {
    const sRegex = { $regex: search, $options: "i" };
    leadQuery.$and = [
      {
        $or: [
          { leadId: sRegex },
          { clientName: sRegex },
          { phoneNumber: sRegex },
          { phone: sRegex },
          { lossReason: sRegex }
        ]
      }
    ];
    lossLeadQuery.$or = [
      { leadId: sRegex },
      { clientName: sRegex },
      { phoneNumber: sRegex },
      { phone: sRegex },
      { lossReason: sRegex }
    ];
  }

  const leadsCollection = await Lead.find(leadQuery)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ lossDate: -1, updatedAt: -1 })
    .lean();

  const lossLeadsCollection = await LossLead.find(lossLeadQuery)
    .populate("lead")
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ lossDate: -1, createdAt: -1 })
    .lean();

  const seenIds = new Set();
  const mergedList = [];

  for (const item of lossLeadsCollection) {
    const idStr = item._id.toString();
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      const itemObj = item.toObject ? item.toObject() : item;
      if (!itemObj.leadStatus || itemObj.leadStatus === "CLOSED_LOST") {
        itemObj.leadStatus = "LOST";
      }
      if (itemObj.status === "CLOSED_LOST") {
        itemObj.status = "LOST";
      }
      mergedList.push(itemObj);
    }
  }

  for (const item of leadsCollection) {
    const idStr = item._id.toString();
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      const itemObj = item.toObject ? item.toObject() : item;
      if (!itemObj.lossReason) itemObj.lossReason = itemObj.remark || "Closed Lost";
      if (!itemObj.reason) itemObj.reason = itemObj.lossReason;
      if (!itemObj.remark) itemObj.remark = itemObj.lossRemark || itemObj.remark || "";
      if (!itemObj.leadStatus || itemObj.leadStatus === "CLOSED_LOST") {
        itemObj.leadStatus = "LOST";
      }
      if (itemObj.status === "CLOSED_LOST") {
        itemObj.status = "LOST";
      }
      mergedList.push(itemObj);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const paginatedList = mergedList.slice(skip, skip + Number(limit));
  const total = mergedList.length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leads: paginatedList,
        lossLeads: paginatedList,
        data: paginatedList,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      "Loss leads retrieved successfully"
    )
  );
});

export const getFollowupLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    assignedTo,
    status,
    leadStatus,
    leadMode,
    leadType,
    workCategory,
    salesPerson,
    city,
    state,
    dateFrom,
    dateTo,
    scope
  } = req.query;

  const andConditions = [
    { isLoss: { $ne: true } },
    { status: { $nin: ["CLOSED_LOST", "LOST", "closed_lost", "lost", "LOSS"] } },
    { leadStatus: { $nin: ["CLOSED_LOST", "LOST", "closed_lost", "lost", "LOSS"] } },
    {
      $or: [
        { isFollowup: true },
        { isFollowupScheduled: true },
        { followupCount: { $gt: 0 } },
        { followupRemarksCount: { $gt: 0 } },
        { "followupHistory.0": { $exists: true } },
        { nextFollowupDate: { $ne: null, $exists: true } }
      ]
    }
  ];

  if (req.user?.role === "SALES_EXECUTIVE") {
    const userRegex = new RegExp(req.user.name, "i");
    andConditions.push({
      $or: [
        { assignedTo: req.user._id },
        { salesPerson: { $regex: userRegex } },
        { assignTo: { $regex: userRegex } }
      ]
    });
  } else if (assignedTo) {
    andConditions.push({ assignedTo });
  }

  if (scope === "SELF" && req.user?.name) {
    const selfRegex = new RegExp(req.user.name, "i");
    andConditions.push({
      $or: [
        { assignedTo: req.user._id },
        { salesPerson: { $regex: selfRegex } },
        { assignTo: { $regex: selfRegex } }
      ]
    });
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    andConditions.push({
      $or: [
        { leadId: searchRegex },
        { clientName: searchRegex },
        { phoneNumber: searchRegex },
        { contact: searchRegex },
        { followupRemark: searchRegex },
        { emailAddress: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { projectDetail: searchRegex },
        { requirement: searchRegex }
      ]
    });
  }

  const effectiveStatus = status || leadStatus;
  if (effectiveStatus && effectiveStatus !== "ALL") {
    andConditions.push({
      $or: [{ status: effectiveStatus }, { leadStatus: effectiveStatus }]
    });
  }

  if (leadMode && leadMode !== "ALL") {
    andConditions.push({
      $or: [{ leadMode }, { leadSource: leadMode }]
    });
  }

  if (leadType && leadType !== "ALL") {
    andConditions.push({ leadType });
  }

  if (workCategory && workCategory !== "ALL") {
    andConditions.push({
      $or: [{ workCategory }, { leadLabel: workCategory }]
    });
  }

  if (salesPerson && salesPerson !== "ALL") {
    const spRegex = new RegExp(salesPerson, "i");
    andConditions.push({
      $or: [
        { salesPerson: { $regex: spRegex } },
        { assignTo: { $regex: spRegex } }
      ]
    });
  }

  if (city && city !== "ALL") {
    andConditions.push({ city: { $regex: new RegExp(city, "i") } });
  }

  if (state && state !== "ALL") {
    andConditions.push({ state: { $regex: new RegExp(state, "i") } });
  }

  if (dateFrom && dateTo) {
    andConditions.push({
      $or: [
        {
          nextFollowupDate: {
            $gte: new Date(dateFrom),
            $lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999))
          }
        },
        {
          createdAt: {
            $gte: new Date(dateFrom),
            $lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999))
          }
        }
      ]
    });
  } else if (dateFrom) {
    andConditions.push({
      $or: [
        { nextFollowupDate: { $gte: new Date(dateFrom) } },
        { createdAt: { $gte: new Date(dateFrom) } }
      ]
    });
  }

  const query = { $and: andConditions };

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const leads = await Lead.find(query)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await Lead.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leads,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      },
      "Followup leads retrieved successfully"
    )
  );
});

export const markLeadAsLoss = asyncHandler(async (req, res) => {
  const targetId = req.params.id || req.body.id || req.body.leadId || req.body._id;
  const { lossReason, lossRemark, remark, reason } = req.body;

  let lead = await findLeadByIdOrLeadId(targetId);

  const finalReason = lossReason || reason || "Marked as lost lead";
  const finalRemark = lossRemark || remark || "";

  if (!lead) {
    // If lead not found, create a new LossLead entry directly
    const lossLead = await LossLead.create({
      clientName: req.body.clientName || req.body.name || req.body.concernPersonName || "Unknown Client",
      phoneNumber: req.body.phoneNumber || req.body.phone || req.body.whatsappNumber || "0000000000",
      alternateNumber: req.body.alternateNumber || "",
      emailAddress: req.body.emailAddress || req.body.email || "",
      workCategory: req.body.workCategory || "",
      workType: req.body.workType || [],
      expectedBusiness: Number(req.body.expectedBusiness || req.body.budget) || 0,
      budget: Number(req.body.expectedBusiness || req.body.budget) || 0,
      lossReason: finalReason,
      lossRemark: finalRemark,
      lossDate: req.body.lossDate || new Date(),
      assignedTo: req.body.assignedTo || req.user?._id || null,
      createdBy: req.user?._id || null
    });

    return res
      .status(200)
      .json(new ApiResponse(200, lossLead, "Lead marked as loss successfully"));
  }

  lead.status = "CLOSED_LOST";
  lead.leadStatus = "CLOSED_LOST";
  lead.leadLabel = "CLOSED_LOST";
  lead.isLoss = true;
  lead.isAssigned = false;
  lead.isFollowup = false;
  lead.isFollowupScheduled = false;
  lead.lossReason = finalReason;
  lead.lossRemark = finalRemark;
  lead.lossDate = new Date();

  recordLeadAction(
    lead,
    "LEAD_LOST",
    `Lead marked as Loss`,
    `Reason: ${finalReason}${finalRemark ? ` - ${finalRemark}` : ""}`,
    req.user?.name || "System"
  );

  await lead.save();

  await AssignedLead.updateMany(
    { $or: [{ lead: lead._id }, { leadId: lead.leadId }] },
    { $set: { isLoss: true, isAssigned: false, status: "CLOSED_LOST", leadStatus: "CLOSED_LOST" } }
  );

  const lossLead = await LossLead.create({
    lead: lead._id,
    leadId: lead.leadId,
    clientName: lead.clientName,
    phoneNumber: lead.phoneNumber,
    phone: lead.phoneNumber,
    alternateNumber: lead.alternateNumber,
    emailAddress: lead.emailAddress,
    email: lead.emailAddress,
    workCategory: lead.workCategory,
    workType: lead.workType,
    expectedBusiness: lead.expectedBusiness,
    budget: lead.budget,
    lossReason: finalReason,
    reason: finalReason,
    lossRemark: finalRemark,
    remark: finalRemark,
    lossDate: lead.lossDate,
    assignedTo: lead.assignedTo,
    createdBy: req.user?._id || null
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { lead, lossLead }, "Lead marked as loss successfully"));
});

export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await findLeadByIdOrLeadId(id);

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (!lead.leadId) {
    lead.leadId = await generateUniqueLeadId(Lead);
    await lead.save();
  }

  await lead.populate("assignedTo", "name email phone role");
  await lead.populate("createdBy", "name email");

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead details retrieved successfully"));
});

export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await findLeadByIdOrLeadId(id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }
  if (req.body.assignedTo && !mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
    if (!req.body.salesPerson && !req.body.assignTo) {
      req.body.salesPerson = req.body.assignedTo;
      req.body.assignTo = req.body.assignedTo;
    }
    delete req.body.assignedTo;
  }

  if (req.body.salesPerson || req.body.assignTo) {
    const person = req.body.salesPerson || req.body.assignTo;
    if (person && person !== "Unassigned") {
      req.body.salesPerson = person;
      req.body.assignTo = person;
      req.body.isAssigned = true;
    }
  }

  Object.assign(lead, req.body);
  const checkStatus = (req.body.status || req.body.leadStatus || "").toUpperCase();
  const checkLoss = req.body.isLoss === true || req.body.isLoss === "true" || checkStatus.includes("LOSS") || checkStatus.includes("LOST");

  if (checkLoss) {
    lead.isLoss = true;
    lead.lossReason = req.body.lossReason || req.body.reason || lead.lossReason || "Lead updated to Loss";
    lead.lossRemark = req.body.lossRemark || req.body.remark || lead.lossRemark || "";
    if (!lead.lossDate) lead.lossDate = new Date();

    await LossLead.create({
      lead: lead._id,
      leadId: lead.leadId,
      clientName: lead.clientName,
      phoneNumber: lead.phoneNumber,
      phone: lead.phoneNumber,
      alternateNumber: lead.alternateNumber,
      emailAddress: lead.emailAddress,
      email: lead.emailAddress,
      workCategory: lead.workCategory,
      workType: lead.workType,
      expectedBusiness: lead.expectedBusiness,
      budget: lead.budget,
      lossReason: lead.lossReason,
      reason: lead.lossReason,
      lossRemark: lead.lossRemark,
      remark: lead.lossRemark,
      lossDate: lead.lossDate,
      assignedTo: lead.assignedTo,
      createdBy: req.user?._id || null
    });
  }

  if (req.body.isFollowupScheduled === true || (req.body.nextFollowupDate && req.body.isFollowupScheduled !== false && (req.body.followupCount > 0 || req.body.followupRemarksCount > 0))) {
    lead.isFollowup = true;
    lead.isFollowupScheduled = true;
    lead.followupCount = Math.max(lead.followupCount || 0, Number(req.body.followupRemarksCount) || 1, Number(req.body.followupCount) || 1);
    lead.followupRemarksCount = Math.max(lead.followupRemarksCount || 0, Number(req.body.followupRemarksCount) || 1);
    if (req.body.nextFollowupDate) {
      const parsed = new Date(req.body.nextFollowupDate);
      if (!isNaN(parsed.getTime())) {
        lead.nextFollowupDate = parsed;
      }
    }
    if (req.body.followupTime) {
      lead.followupTime = req.body.followupTime;
    }
  } else if (req.body.isFollowupScheduled === false || req.body.followupCount === 0) {
    lead.isFollowup = false;
    lead.isFollowupScheduled = false;
    lead.followupCount = 0;
    lead.followupRemarksCount = 0;
    lead.nextFollowupDate = null;
    lead.followupTime = "";
  }

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

  const lead = await findLeadByIdOrLeadId(id);
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

  await AssignedLead.create({
    lead: lead._id,
    leadId: lead.leadId,
    clientName: lead.clientName,
    phoneNumber: lead.phoneNumber,
    phone: lead.phoneNumber,
    alternateNumber: lead.alternateNumber,
    emailAddress: lead.emailAddress,
    email: lead.emailAddress,
    workCategory: lead.workCategory,
    workType: lead.workType,
    expectedBusiness: lead.expectedBusiness,
    budget: lead.budget,
    salesPerson: assigneeName || lead.salesPerson || "Sales TL",
    assignTo: assigneeName || lead.salesPerson || "Sales TL",
    assignedTo: mongoose.Types.ObjectId.isValid(targetId) ? targetId : lead.assignedTo,
    assignedBy: req.user?._id || null,
    assignedDate: new Date(),
    isAssigned: true,
    status: lead.leadStatus || "Warm",
    leadStatus: lead.leadStatus || "Warm",
    remark: reason || lead.remark || "",
    notes: reason || lead.remark || "",
    createdBy: req.user?._id || null
  });

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead assigned successfully"));
});

export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, leadStatus, leadLabel, newStatus, remark, reason, lossReason, lossRemark, isLoss } = req.body;

  const targetStatus = status || leadStatus || leadLabel || newStatus || "CLOSED_LOST";

  const lead = await findLeadByIdOrLeadId(id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  lead.status = targetStatus;
  lead.leadStatus = targetStatus;
  lead.leadLabel = targetStatus.toUpperCase();

  const st = targetStatus.toUpperCase();
  const isLossStatus = isLoss === true || isLoss === "true" || st.includes("LOSS") || st.includes("LOST") || st === "UNQUALIFIED";

  if (isLossStatus) {
    lead.isLoss = true;
    lead.lossReason = lossReason || reason || remark || "Status set to Loss";
    lead.lossRemark = lossRemark || remark || "";
    lead.lossDate = new Date();

    await LossLead.create({
      lead: lead._id,
      leadId: lead.leadId,
      clientName: lead.clientName,
      phoneNumber: lead.phoneNumber,
      phone: lead.phoneNumber,
      alternateNumber: lead.alternateNumber,
      emailAddress: lead.emailAddress,
      email: lead.emailAddress,
      workCategory: lead.workCategory,
      workType: lead.workType,
      expectedBusiness: lead.expectedBusiness,
      budget: lead.budget,
      lossReason: lead.lossReason,
      reason: lead.lossReason,
      lossRemark: lead.lossRemark,
      remark: lead.lossRemark,
      lossDate: lead.lossDate,
      assignedTo: lead.assignedTo,
      createdBy: req.user?._id || null
    });
  }

  recordLeadAction(lead, "STATUS_CHANGED", `Status updated to ${targetStatus}`, remark || reason || `Status set to ${targetStatus}`, req.user?.name || "System");
  await lead.save();

  return res
    .status(200)
    .json(new ApiResponse(200, lead, "Lead status updated successfully"));
});

export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await findLeadByIdOrLeadId(id);

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  await Lead.findByIdAndDelete(lead._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Lead deleted successfully"));
});

