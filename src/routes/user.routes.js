import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  restoreUser,
  permanentDeleteUser,
  bulkDeleteUsers,
  toggleUserStatus
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ============================================
// User Routes (/api/v1/users)
// ============================================

// 1. Create user
router.post("/", createUser);

// 2. Get all users (supports filters: ?search=&role=&branch=&department=&isActive=)
router.get("/", getAllUsers);

// 3. Bulk delete users
router.delete("/bulk/delete", bulkDeleteUsers);

// 4. Get user by email
router.get("/email/:email", getUserByEmail);

// 5. Get single user by ID
router.get("/:id", getUserById);

// 6. Update user by ID
router.put("/:id", updateUser);

// 7. Toggle active/inactive status
router.patch("/:id/toggle-status", toggleUserStatus);

// 8. Soft delete user
router.delete("/:id", deleteUser);

// 9. Restore soft deleted user
router.patch("/:id/restore", restoreUser);

// 10. Permanent hard delete user
router.delete("/:id/permanent", permanentDeleteUser);

export default router;