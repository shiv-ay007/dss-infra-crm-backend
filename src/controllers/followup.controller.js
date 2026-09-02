import { Followup } from "../models/followup.model.js";
import { Lead } from "../models/lead.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordLeadAction } from "../utils/dateHelper.js";

export const getAllFollowups = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, assignedTo } = req.query;

  const query = {};

  if (status) {
    query.status = { $regex: new RegExp(`^${status}$`, "i") };
  }

  if (req.user?.role === "SALES_EXECUTIVE") {
    query.assignedTo = req.user._id;
  } else if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const followups = await Followup.find(query)
    .populate({
      path: "lead",
      select: "leadId clientName phoneNumber alternateNumber emailAddress workCategory workType leadStatus expectedBusiness budget address salesPerson assignedTo"
    })
    .populate("createdBy", "name email role")
    .populate("assignedTo", "name email phone role")
    .sort({ scheduledDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  let filteredFollowups = followups;
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filteredFollowups = followups.filter((f) => {
      const matchRemarks = f.remarks && searchRegex.test(f.remarks);
      const matchLeadName = f.lead && f.lead.clientName && searchRegex.test(f.lead.clientName);
      const matchLeadPhone = f.lead && f.lead.phoneNumber && searchRegex.test(f.lead.phoneNumber);
      return matchRemarks || matchLeadName || matchLeadPhone;
    });
  }

  const total = await Followup.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        followups: filteredFollowups,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      "All follow-ups retrieved successfully"
    )
  );
});

export const addFollowup = asyncHandler(async (req, res) => {
  const {
    leadId,
    remarks,
    remark,
    scheduledDate,
    scheduledTime,
    followupType,
    priority,
    status,
    assignedTo
  } = req.body;

  const finalRemarks = remarks || remark;
  if (!leadId || !finalRemarks || !scheduledDate) {
    throw new ApiError(
      400,
      "Lead ID, remarks, and scheduled date are required"
    );
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const followup = await Followup.create({
    lead: leadId,
    remarks: finalRemarks,
    scheduledDate,
    scheduledTime: scheduledTime || "",
    followupType: followupType || "Call",
    priority: priority || "MEDIUM",
    status: status || "SCHEDULED",
    assignedTo: assignedTo || lead.assignedTo || req.user._id,
    createdBy: req.user._id
  });

  // Update lead's next follow-up date and record action stamp
  lead.nextFollowupDate = scheduledDate;
  lead.followupTime = scheduledTime || lead.followupTime || "";
  lead.followupRemark = finalRemarks;
  lead.isFollowup = true;
  lead.followupStatus = status || "SCHEDULED";
  lead.followupCount = (lead.followupCount || 0) + 1;

  recordLeadAction(lead, "FOLLOWUP_SCHEDULED", "Follow-up scheduled", finalRemarks, req.user?.name || "System");
  await lead.save();

  return res
    .status(201)
    .json(new ApiResponse(201, followup, "Follow-up added successfully"));
});

export const getLeadFollowups = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const followups = await Followup.find({ lead: leadId })
    .populate("createdBy", "name email role")
    .populate("assignedTo", "name email phone role")
    .sort({ scheduledDate: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        followups,
        "Lead follow-ups retrieved successfully"
      )
    );
});

export const updateFollowup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks, scheduledDate, scheduledTime, followupType, priority, status, assignedTo } = req.body;

  const updateFields = {};
  if (remarks !== undefined) updateFields.remarks = remarks;
  if (scheduledDate !== undefined) updateFields.scheduledDate = scheduledDate;
  if (scheduledTime !== undefined) updateFields.scheduledTime = scheduledTime;
  if (followupType !== undefined) updateFields.followupType = followupType;
  if (priority !== undefined) updateFields.priority = priority;
  if (status !== undefined) updateFields.status = status;
  if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;

  const followup = await Followup.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  );

  if (!followup) {
    throw new ApiError(404, "Follow-up entry not found");
  }

  // Sync back to Lead
  if (followup.lead) {
    const lead = await Lead.findById(followup.lead);
    if (lead) {
      if (scheduledDate) lead.nextFollowupDate = scheduledDate;
      if (remarks) lead.followupRemark = remarks;
      if (status) lead.followupStatus = status;
      await lead.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, followup, "Follow-up updated successfully"));
});

export const deleteFollowup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followup = await Followup.findByIdAndDelete(id);

  if (!followup) {
    throw new ApiError(404, "Follow-up entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Follow-up entry deleted successfully"));
});
