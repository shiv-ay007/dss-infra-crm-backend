import { Followup } from "../models/followup.model.js";
import { Lead } from "../models/lead.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordLeadAction } from "../utils/dateHelper.js";

export const addFollowup = asyncHandler(async (req, res) => {
  const { leadId, remarks, scheduledDate, status } = req.body;

  if (!leadId || !remarks || !scheduledDate) {
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
    remarks,
    scheduledDate,
    status: status || "SCHEDULED",
    createdBy: req.user._id
  });

  // Update lead's next follow-up date and record action stamp
  lead.nextFollowupDate = scheduledDate;
  recordLeadAction(lead, "FOLLOWUP_SCHEDULED", "Follow-up scheduled", remarks, req.user?.name || "System");
  await lead.save();

  return res
    .status(201)
    .json(new ApiResponse(201, followup, "Follow-up added successfully"));
});

export const getLeadFollowups = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const followups = await Followup.find({ lead: leadId })
    .populate("createdBy", "name email role")
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
  const { remarks, scheduledDate, status } = req.body;

  const followup = await Followup.findByIdAndUpdate(
    id,
    { $set: { remarks, scheduledDate, status } },
    { new: true }
  );

  if (!followup) {
    throw new ApiError(404, "Follow-up entry not found");
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
