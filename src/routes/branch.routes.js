import express from "express";
import {
  createBranch,
  getAllBranches,
  getBranchById,
  getBranchesByState,
  getBranchesByCity,
  getBranchesByPincode,
  updateBranch,
  deleteBranch,
  restoreBranch,
  permanentDeleteBranch,
  bulkDeleteBranches,
  getBranchStatistics
} from "../controllers/branch.controller.js";

const router = express.Router();

// ============================================
// Branch Routes
// ============================================

// Create branch
router.post("/", createBranch);

// Get all branches (with filters & pagination)
router.get("/", getAllBranches);

// Get branch statistics (with toggle filter)
router.get("/statistics", getBranchStatistics);

// Get branches by state
router.get("/state/:state", getBranchesByState);

// Get branches by city
router.get("/city/:city", getBranchesByCity);

// Get branches by pincode
router.get("/pincode/:pincode", getBranchesByPincode);

// Get single branch
router.get("/:id", getBranchById);

// Update branch
router.put("/:id", updateBranch);

// Soft delete branch
router.delete("/:id", deleteBranch);

// Restore soft deleted branch
router.patch("/:id/restore", restoreBranch);

// Permanent delete branch
router.delete("/:id/permanent", permanentDeleteBranch);

// Bulk delete branches
router.delete("/bulk/delete", bulkDeleteBranches);

export default router;