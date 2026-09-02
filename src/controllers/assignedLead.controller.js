import { AssignedLead } from "../models/assignedLead.model.js";
import { Lead } from "../models/lead.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordLeadAction } from "../utils/dateHelper.js";

export const createAssignedLead = asyncHandler(async (req, res) => {
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
    salesPerson,
    assignTo,
    assignedTo,
    remark,
    notes,
    remarkAttachments,
    leadMode,
    leadType,
    status,
    leadStatus
  } = req.body;

  const finalName = clientName || name || concernPersonName;
  const finalPhone = phoneNumber || phone || req.body.whatsappNumber;
  const finalEmail = emailAddress || email || "";

  if (!finalName || !finalPhone) {
    throw new ApiError(400, "Client name and phone number are required");
  }

  let leadDoc = null;
  if (leadId) {
    leadDoc = await Lead.findOne({
      $or: [{ _id: leadId }, { leadId }]
    });
  }

  const rawAssignee = salesPerson || assignTo || "Sales TL";
  const assigneeName = String(rawAssignee).replace(" (Current User)", "").replace("(Current User)", "").trim();

  if (leadDoc) {
    leadDoc.isAssigned = true;
    leadDoc.salesPerson = assigneeName;
    if (assignedTo) leadDoc.assignedTo = assignedTo;
    await leadDoc.save();
  }

  const assignedLead = await AssignedLead.create({
    lead: leadDoc ? leadDoc._id : null,
    leadId: leadDoc ? leadDoc.leadId : leadId || `LEAD-${Date.now()}`,
    clientName: finalName,
    phoneNumber: finalPhone,
    phone: finalPhone,
    emailAddress: finalEmail,
    email: finalEmail,
    alternateNumber: alternateNumber || "",
    workCategory: workCategory || "Design",
    workType: Array.isArray(workType) ? workType : (workType ? [workType] : []),
    address: address || (leadDoc ? leadDoc.address : "") || "",
    city: city || (leadDoc ? leadDoc.city : "") || "",
    pincode: pincode || (leadDoc ? leadDoc.pincode : "") || "",
    state: state || (leadDoc ? leadDoc.state : "") || "",
    expectedBusiness: Number(expectedBusiness || budget) || 0,
    budget: Number(expectedBusiness || budget) || 0,
    salesPerson: assigneeName,
    assignTo: assigneeName,
    assignedTo: assignedTo || (leadDoc ? leadDoc.assignedTo : req.user?._id) || null,
    assignedBy: req.user?._id || null,
    assignedDate: new Date(),
    isAssigned: true,
    status: leadStatus || status || "Warm",
    leadStatus: leadStatus || status || "Warm",
    remark: remark || notes || "",
    notes: remark || notes || "",
    remarkAttachments: remarkAttachments || [],
    leadMode: leadMode || "Business networking",
    leadType: leadType || "FRESH",
    createdBy: req.user?._id || null
  });

  return res
    .status(201)
    .json(new ApiResponse(201, assignedLead, "Assigned lead entry created successfully"));
});

export const getAllAssignedLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 1000, search, assignedTo } = req.query;

  const assignedLeadQuery = { isAssigned: true };
  const leadQuery = {
    $or: [
      { isAssigned: true },
      { salesPerson: { $exists: true, $ne: "" } }
    ]
  };

  if (req.user?.role === "SALES_EXECUTIVE") {
    assignedLeadQuery.assignedTo = req.user._id;
    leadQuery.assignedTo = req.user._id;
  } else if (assignedTo) {
    assignedLeadQuery.assignedTo = assignedTo;
    leadQuery.assignedTo = assignedTo;
  }

  if (search) {
    const sRegex = { $regex: search, $options: "i" };
    assignedLeadQuery.$or = [
      { leadId: sRegex },
      { clientName: sRegex },
      { phoneNumber: sRegex },
      { phone: sRegex },
      { emailAddress: sRegex },
      { salesPerson: sRegex }
    ];
    leadQuery.$and = [
      {
        $or: [
          { leadId: sRegex },
          { clientName: sRegex },
          { phoneNumber: sRegex },
          { phone: sRegex },
          { emailAddress: sRegex },
          { salesPerson: sRegex }
        ]
      }
    ];
  }

  const assignedCollection = await AssignedLead.find(assignedLeadQuery)
    .populate("lead")
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ assignedDate: -1, createdAt: -1 });

  const leadsCollection = await Lead.find(leadQuery)
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ updatedAt: -1, createdAt: -1 });

  const seenIds = new Set();
  const mergedList = [];

  for (const item of assignedCollection) {
    const idStr = (item.leadId || item._id).toString();
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      mergedList.push(item);
    }
  }

  for (const item of leadsCollection) {
    const idStr = (item.leadId || item._id).toString();
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      mergedList.push(item.toObject ? item.toObject() : item);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const paginatedList = mergedList.slice(skip, skip + Number(limit));
  const total = mergedList.length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        assignedLeads: paginatedList,
        leads: paginatedList,
        data: paginatedList,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      "Assigned leads retrieved successfully"
    )
  );
});

export const getAssignedLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignedLead = await AssignedLead.findById(id)
    .populate("lead")
    .populate("assignedTo", "name email phone role")
    .populate("createdBy", "name email");

  if (!assignedLead) {
    throw new ApiError(404, "Assigned lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, assignedLead, "Assigned lead details retrieved successfully"));
});

export const updateAssignedLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignedLead = await AssignedLead.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  if (!assignedLead) {
    throw new ApiError(404, "Assigned lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, assignedLead, "Assigned lead entry updated successfully"));
});

export const deleteAssignedLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignedLead = await AssignedLead.findByIdAndDelete(id);

  if (!assignedLead) {
    throw new ApiError(404, "Assigned lead entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Assigned lead entry deleted successfully"));
});
