import { Notification } from "../models/notification.model.js";
import { Lead } from "../models/lead.model.js";
import { LeadProject } from "../models/leadProject.model.js";
import { Payment } from "../models/payment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

let lastSyncTimestamp = 0;

/**
 * Helper to dynamically synchronize Module 1, 2, 3 reminders without manual data entry:
 * - Trigger 1: Lead Next Follow-up Date (Due Today / Overdue)
 * - Trigger 2: Presale sub-stage allowed time exceeded (Ageing alert > 3 days)
 * - Trigger 5: Recent payment recorded alerts
 */
export const syncAutoReminders = async (user) => {
  const nowMs = Date.now();
  // Throttle check to at most once per 20 seconds
  if (nowMs - lastSyncTimestamp < 20000) {
    return;
  }
  lastSyncTimestamp = nowMs;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. TRIGGER 1: Lead Follow-up Due / Overdue
    const leadsWithFollowup = await Lead.find({
      isDeleted: { $ne: "1" },
      isLoss: { $ne: true },
      "followups.0": { $exists: true }
    })
      .select("_id clientName phoneNumber followups leadBy")
      .lean();

    for (const lead of leadsWithFollowup) {
      if (!Array.isArray(lead.followups) || lead.followups.length === 0) continue;
      const scheduledFollowups = lead.followups.filter((f) => f.dateTime);
      if (scheduledFollowups.length === 0) continue;

      scheduledFollowups.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      const latest = scheduledFollowups[0];
      const fDate = new Date(latest.dateTime);

      const isOverdue = fDate < startOfToday;
      const isDueToday = fDate >= startOfToday && fDate <= endOfToday;

      if (isOverdue || isDueToday) {
        const dateTag = fDate.toISOString().split("T")[0];
        const alertKey = `lead_followup_${lead._id}_${dateTag}_${isOverdue ? "overdue" : "due"}`;

        const existing = await Notification.findOne({ alertKey });
        if (!existing) {
          await Notification.create({
            alertKey,
            recipient: lead.leadBy || null,
            department: "sales",
            title: isOverdue ? `Overdue Follow-up: ${lead.clientName}` : `Follow-up Due Today: ${lead.clientName}`,
            message: isOverdue
              ? `Scheduled follow-up with ${lead.clientName} (${lead.phoneNumber || "No phone"}) was due on ${fDate.toLocaleDateString("en-IN")}. Action required.`
              : `Follow-up with ${lead.clientName} (${lead.phoneNumber || "No phone"}) is scheduled for today.`,
            type: isOverdue ? "FOLLOWUP_OVERDUE" : "FOLLOWUP_DUE",
            priority: isOverdue ? "urgent" : "high",
            leadId: lead._id,
            clientName: lead.clientName,
            link: `/sales/leads/details/${lead._id}`,
            metadata: {
              leadId: lead._id,
              followupDate: latest.dateTime,
              followupType: latest.type || "Call"
            }
          });
        }
      }
    }

    // 2. TRIGGER 2: Presale Sub-stage Ageing (> 3 days in current stage)
    const allowedAgeDays = 3;
    const presaleAgeThreshold = new Date(now.getTime() - allowedAgeDays * 24 * 60 * 60 * 1000);

    const stalePresaleProjects = await LeadProject.find({
      isClosed: { $ne: true },
      isCompleted: { $ne: true },
      status: { $in: ["INTERESTED", "IN_PROGRESS", "ACTIVE_PROJECT", "ACTIVE"] },
      updatedAt: { $lte: presaleAgeThreshold }
    })
      .select("_id clientName projectName projectCoordinatorName nextPersonName status updatedAt")
      .lean();

    for (const proj of stalePresaleProjects) {
      const daysPending = Math.floor((now.getTime() - new Date(proj.updatedAt).getTime()) / (24 * 60 * 60 * 1000));
      const alertKey = `presale_age_${proj._id}_stage_${proj.status}_days_${Math.floor(daysPending / 3)}`;

      const existing = await Notification.findOne({ alertKey });
      if (!existing) {
        await Notification.create({
          alertKey,
          recipient: null,
          department: "sales",
          title: `Presale Stage Delay: ${proj.projectName || proj.clientName}`,
          message: `Project ${proj.projectName || ""} (${proj.clientName}) has been pending in ${proj.status} for ${daysPending} days without status update.`,
          type: "PRESALE_AGEING",
          priority: "high",
          clientName: proj.clientName,
          link: `/sales/presales`,
          metadata: {
            projectId: proj._id,
            daysPending,
            stage: proj.status,
            assignedPerson: proj.projectCoordinatorName || proj.nextPersonName || ""
          }
        });
      }
    }

    // 3. TRIGGER 5: Recent Payments recorded
    const recentPayments = await Payment.find({
      createdAt: { $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    for (const pay of recentPayments) {
      const alertKey = `payment_rec_${pay._id}`;
      const existing = await Notification.findOne({ alertKey });
      if (!existing) {
        await Notification.create({
          alertKey,
          recipient: null,
          department: "sales",
          title: `Payment Received: ₹${Number(pay.amount || 0).toLocaleString("en-IN")}`,
          message: `${pay.paymentType || "Payment"} of ₹${Number(pay.amount || 0).toLocaleString("en-IN")} received via ${pay.paymentMode || "UPI"} for ${pay.clientName} (${pay.projectName || "Project"}). Received by: ${pay.receivedBy || "Staff"}.`,
          type: "PAYMENT_RECORDED",
          priority: "normal",
          clientName: pay.clientName,
          link: `/sales/payments/details/${pay.projectId}`,
          metadata: {
            paymentId: pay._id,
            projectId: pay.projectId,
            amount: pay.amount,
            mode: pay.paymentMode
          }
        });
      }
    }
  } catch (err) {
    console.error("Auto notification sync error (non-fatal):", err);
  }
};

/**
 * 1. Get all notifications for current user/department
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const userDept = req.user?.department || "sales";
  const { filter, limit = 40 } = req.query;

  // Run dynamic reminder engine
  await syncAutoReminders(req.user);

  // Query condition: Targeted to current user OR broadcast to all (null / unset recipient)
  const recipientConditions = [{ recipient: null }, { recipient: { $exists: false } }];
  if (userId) {
    recipientConditions.push({ recipient: userId });
  }

  const query = {
    isDismissed: { $ne: true },
    $or: recipientConditions
  };

  if (filter === "unread") {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  // Fast Unread Count
  const unreadCount = await Notification.countDocuments({
    ...query,
    isRead: false
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount
      },
      "Notifications fetched successfully"
    )
  );
});

/**
 * 2. Get unread notification count only (for badge)
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const userDept = req.user?.department || "sales";

  // Run dynamic reminder engine
  await syncAutoReminders(req.user);

  const recipientConditions = [{ recipient: null }, { recipient: { $exists: false } }];
  if (userId) {
    recipientConditions.push({ recipient: userId });
  }

  const unreadCount = await Notification.countDocuments({
    isDismissed: { $ne: true },
    $or: recipientConditions,
    isRead: false
  });

  return res.status(200).json(
    new ApiResponse(200, { unreadCount }, "Unread count fetched successfully")
  );
});

/**
 * 3. Mark single notification as read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

/**
 * 4. Mark all notifications as read
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const userDept = req.user?.department || "sales";

  const result = await Notification.updateMany(
    {
      isDismissed: { $ne: true },
      $or: [
        { recipient: userId },
        { recipient: null, department: { $in: [userDept, "sales", "all"] } }
      ],
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );

  return res.status(200).json(
    new ApiResponse(200, { modifiedCount: result.modifiedCount }, "All notifications marked as read")
  );
});

/**
 * 5. Delete / Dismiss a notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updated = await Notification.findByIdAndUpdate(
    id,
    {
      $set: {
        isDismissed: true,
        dismissedAt: new Date(),
        isRead: true
      }
    },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(404, "Notification not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { id }, "Notification dismissed successfully")
  );
});

/**
 * 6. Internal / API creation helper
 */
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type, leadId, link, priority, recipient, department, clientName } = req.body;

  if (!title || !message) {
    throw new ApiError(400, "Title and message are required");
  }

  const notification = await Notification.create({
    title,
    message,
    type: type || "SYSTEM",
    leadId: leadId || null,
    link: link || (leadId ? `/sales/leads/details/${leadId}` : ""),
    priority: priority || "normal",
    recipient: recipient || null,
    department: department || "sales",
    clientName: clientName || ""
  });

  return res.status(201).json(
    new ApiResponse(201, notification, "Notification created successfully")
  );
});
