import { Lead } from "../models/lead.model.js";
import { Followup } from "../models/followup.model.js";
import { User } from "../models/user.model.js";
import { LossLead } from "../models/lossLead.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "SALES_EXECUTIVE") {
    filter.assignedTo = req.user._id;
  }

  // 1. Total Leads Count
  const totalLeads = await Lead.countDocuments(filter);

  // 2. Status Breakdown
  const statusStats = await Lead.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  // Format status stats object
  const statusBreakdown = statusStats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  // 3. Priority Breakdown
  const priorityStats = await Lead.aggregate([
    { $match: filter },
    { $group: { _id: "$priority", count: { $sum: 1 } } }
  ]);

  const priorityBreakdown = priorityStats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  // 4. Loss Leads Count
  const lossLeadsCount = await Lead.countDocuments({
    ...filter,
    $or: [
      { isLoss: true },
      { status: { $in: [/loss/i, /lost/i, /closed_lost/i] } },
      { leadStatus: { $in: [/loss/i, /lost/i, /closed_lost/i] } }
    ]
  });

  // 5. Followup Leads Count
  const followupLeadsCount = await Lead.countDocuments({
    ...filter,
    $or: [
      { isFollowup: true },
      { nextFollowupDate: { $ne: null } }
    ]
  });

  // 6. Upcoming follow-ups for today / future
  const now = new Date();
  const upcomingFollowups = await Followup.find({
    scheduledDate: { $gte: now },
    status: "SCHEDULED"
  })
    .populate({
      path: "lead",
      select: "clientName phone companyName status assignedTo",
      match: filter
    })
    .limit(5)
    .sort({ scheduledDate: 1 });

  // 7. Total Users (for Admins / Managers)
  let totalUsers = 0;
  if (req.user.role !== "SALES_EXECUTIVE") {
    totalUsers = await User.countDocuments({ isActive: true });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLeads,
        lossLeadsCount,
        followupLeadsCount,
        statusBreakdown,
        priorityBreakdown,
        upcomingFollowups: upcomingFollowups.filter((f) => f.lead !== null),
        totalUsers
      },
      "Dashboard statistics calculated successfully"
    )
  );
});
