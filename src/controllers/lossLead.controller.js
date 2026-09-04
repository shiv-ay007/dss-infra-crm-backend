import { LossLead } from "../models/lossLead.model.js";
import { Lead } from "../models/lead.model.js";
import { AssignedLead } from "../models/assignedLead.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordLeadAction } from "../utils/dateHelper.js";
import { safePopulateLeadUsers } from "./lead.controller.js";

export const createLossLead = asyncHandler(async (req, res) => {
  const {
    leadId,
    clientName,
    phoneNumber,
    phone,
    emailAddress,
    email,
    name,
    concernPersonName,
    alternateNumber,
    workCategory,
    workType,
    address,
    city,
    pincode,
    state,
    expectedBusiness,
    budget,
    lossReason,
    reason,
    lossRemark,
    remark,
    lossDate,
    assignedTo
  } = req.body;

  const finalName = clientName || name || concernPersonName;
  const finalPhone = phoneNumber || phone || req.body.whatsappNumber;
  const finalEmail = emailAddress || email || "";
  const finalReason = lossReason || reason || req.body.notes || "Loss lead registered";
  const finalRemark = lossRemark || remark || req.body.notes || "";

  if (!finalName || !finalPhone) {
    throw new ApiError(400, "Client name and phone number are required");
  }

  let leadDoc = null;
  if (leadId) {
    leadDoc = await Lead.findOne({
      $or: [{ _id: leadId }, { leadId }]
    });
  }

  if (leadDoc) {
    leadDoc.status = "CLOSED_LOST";
    leadDoc.leadStatus = "CLOSED_LOST";
    leadDoc.leadLabel = "CLOSED_LOST";
    leadDoc.isLoss = true;
    leadDoc.isAssigned = false;
    leadDoc.isFollowup = false;
    leadDoc.isFollowupScheduled = false;
    leadDoc.lossReason = finalReason;
    leadDoc.lossRemark = finalRemark;
    leadDoc.lossDate = lossDate || new Date();

    recordLeadAction(
      leadDoc,
      "LEAD_LOST",
      "Lead registered in Loss Leads",
      finalReason,
      req.user?.name || "System"
    );
    await leadDoc.save();

    await AssignedLead.updateMany(
      { $or: [{ lead: leadDoc._id }, { leadId: leadDoc.leadId }] },
      { $set: { isLoss: true, isAssigned: false, status: "CLOSED_LOST", leadStatus: "CLOSED_LOST" } }
    );
  } else {
    // Also create in Lead collection if not already existing
    const newLeadId = leadId || `LEAD-${Date.now()}`;
    leadDoc = await Lead.create({
      leadId: newLeadId,
      clientName: finalName,
      phoneNumber: finalPhone,
      phone: finalPhone,
      emailAddress: finalEmail,
      email: finalEmail,
      workCategory: workCategory || "General",
      workType: Array.isArray(workType) ? workType : (workType ? [workType] : []),
      address: address || "",
      city: city || "",
      pincode: pincode || "",
      state: state || "",
      leadStatus: "CLOSED_LOST",
      status: "CLOSED_LOST",
      leadLabel: "CLOSED_LOST",
      isLoss: true,
      lossReason: finalReason,
      lossRemark: finalRemark,
      lossDate: lossDate || new Date(),
      expectedBusiness: Number(expectedBusiness || budget) || 0,
      budget: Number(expectedBusiness || budget) || 0,
      assignedTo: assignedTo || req.user?._id || null,
      createdBy: req.user?._id || null
    });
  }

  const lossLead = await LossLead.create({
    lead: leadDoc ? leadDoc._id : null,
    leadId: leadDoc ? leadDoc.leadId : leadId || "",
    clientName: finalName,
    phoneNumber: finalPhone,
    phone: finalPhone,
    emailAddress: finalEmail,
    email: finalEmail,
    alternateNumber: alternateNumber || "",
    workCategory: workCategory || "",
    workType: Array.isArray(workType) ? workType : (workType ? [workType] : []),
    address: address || (leadDoc ? leadDoc.address : "") || "",
    city: city || (leadDoc ? leadDoc.city : "") || "",
    pincode: pincode || (leadDoc ? leadDoc.pincode : "") || "",
    state: state || (leadDoc ? leadDoc.state : "") || "",
    projectDetail: req.body.projectDetail || (leadDoc ? leadDoc.projectDetail : "") || "",
    notes: req.body.notes || (leadDoc ? leadDoc.notes : "") || "",
    salesPerson: req.body.salesPerson || (leadDoc ? leadDoc.salesPerson : "") || "",
    leadMode: req.body.leadMode || (leadDoc ? leadDoc.leadMode : "") || "",
    leadType: req.body.leadType || (leadDoc ? leadDoc.leadType : "LOSS") || "LOSS",
    expectedBusiness: Number(expectedBusiness || budget) || 0,
    budget: Number(expectedBusiness || budget) || 0,
    lossReason: finalReason,
    reason: finalReason,
    lossRemark: finalRemark,
    remark: finalRemark,
    lossDate: lossDate || new Date(),
    assignedTo: assignedTo || (leadDoc ? leadDoc.assignedTo : req.user?._id) || null,
    createdBy: req.user?._id || null
  });

  return res
    .status(201)
    .json(new ApiResponse(201, lossLead, "Loss lead entry created successfully"));
});

export const getAllLossLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, assignedTo } = req.query;

  const lossLeadQuery = {};
  const leadQuery = {
    $or: [
      { isLoss: true },
      { status: { $regex: /loss|lost|closed_lost/i } },
      { leadStatus: { $regex: /loss|lost|closed_lost/i } },
      { leadLabel: { $regex: /loss|lost|closed_lost/i } }
    ]
  };

  if (req.user?.role === "SALES_EXECUTIVE") {
    lossLeadQuery.assignedTo = req.user._id;
    leadQuery.assignedTo = req.user._id;
  } else if (assignedTo) {
    lossLeadQuery.assignedTo = assignedTo;
    leadQuery.assignedTo = assignedTo;
  }

  if (search) {
    const sRegex = { $regex: search, $options: "i" };
    lossLeadQuery.$or = [
      { leadId: sRegex },
      { clientName: sRegex },
      { phoneNumber: sRegex },
      { phone: sRegex },
      { emailAddress: sRegex },
      { lossReason: sRegex }
    ];
    leadQuery.$and = [
      {
        $or: [
          { leadId: sRegex },
          { clientName: sRegex },
          { phoneNumber: sRegex },
          { phone: sRegex },
          { emailAddress: sRegex },
          { lossReason: sRegex }
        ]
      }
    ];
  }

  const lossLeadsCollection = await LossLead.find(lossLeadQuery)
    .populate("lead")
    .sort({ lossDate: -1, createdAt: -1 })
    .lean();
  await safePopulateLeadUsers(lossLeadsCollection);

  const leadsCollection = await Lead.find(leadQuery)
    .sort({ lossDate: -1, createdAt: -1 })
    .lean();
  await safePopulateLeadUsers(leadsCollection);

  const seenIds = new Set();
  const mergedList = [];

  for (const item of lossLeadsCollection) {
    const idStr = item._id.toString();
    const refId = item.lead?._id ? item.lead._id.toString() : (item.lead ? item.lead.toString() : null);
    const leadCode = item.leadId ? String(item.leadId).trim() : null;
    const phone = (item.phoneNumber || item.phone) ? String(item.phoneNumber || item.phone).trim() : null;

    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      if (refId) seenIds.add(refId);
      if (leadCode) seenIds.add("code:" + leadCode);
      if (phone) seenIds.add("phone:" + phone);

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
    const leadCode = item.leadId ? String(item.leadId).trim() : null;
    const phone = (item.phoneNumber || item.phone) ? String(item.phoneNumber || item.phone).trim() : null;

    const isDuplicate =
      seenIds.has(idStr) ||
      (leadCode && seenIds.has("code:" + leadCode)) ||
      (phone && seenIds.has("phone:" + phone));

    if (!isDuplicate) {
      seenIds.add(idStr);
      if (leadCode) seenIds.add("code:" + leadCode);
      if (phone) seenIds.add("phone:" + phone);

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
        lossLeads: paginatedList,
        leads: paginatedList,
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

export const getLossLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lossLead = await LossLead.findById(id)
    .populate("lead")
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email");

  if (!lossLead) {
    throw new ApiError(404, "Loss lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lossLead, "Loss lead details retrieved successfully"));
});

export const updateLossLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lossLead = await LossLead.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  if (!lossLead) {
    throw new ApiError(404, "Loss lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lossLead, "Loss lead entry updated successfully"));
});

export const deleteLossLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lossLead = await LossLead.findByIdAndDelete(id);

  if (!lossLead) {
    throw new ApiError(404, "Loss lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Loss lead entry deleted successfully"));
});
