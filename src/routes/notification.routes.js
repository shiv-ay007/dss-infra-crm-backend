import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
} from "../controllers/notification.controller.js";
import { optionalJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply optionalJWT so authenticated users get personalized notifications,
// and fallback works cleanly for department wide notifications
router.use(optionalJWT);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/", createNotification);
router.patch("/mark-all-read", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
