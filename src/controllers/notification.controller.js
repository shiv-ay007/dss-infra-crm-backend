import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * 1. Get all notifications for current user/department
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const userDept = req.user?.department || "sales";
  const { filter, limit = 40 } = req.query;

  // Query condition: Targeted to current user OR department broadcast (null recipient)
  const query = {
    $or: [
      { recipient: userId },
      { recipient: null, department: { $in: [userDept, "sales", "all"] } }
    ]
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

  const unreadCount = await Notification.countDocuments({
    $or: [
      { recipient: userId },
      { recipient: null, department: { $in: [userDept, "sales", "all"] } }
    ],
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
 * 5. Delete a notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Notification.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, "Notification not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { id }, "Notification deleted successfully")
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
