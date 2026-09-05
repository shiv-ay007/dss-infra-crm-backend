import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
  permanentDeleteDepartment,
  bulkDeleteDepartments,
  getDepartmentsByCity
} from "../controllers/department.controller.js";

const router = express.Router();

// ============================================
// Department Routes
// ============================================

// Create department
router.post("/", createDepartment);

// Get all departments (with filters & pagination)
router.get("/", getAllDepartments);

// Get departments by city
router.get("/city/:city", getDepartmentsByCity);

// Get single department
router.get("/:id", getDepartmentById);

// Update department
router.put("/:id", updateDepartment);

// Soft delete department
router.delete("/:id", deleteDepartment);

// Restore soft deleted department
router.patch("/:id/restore", restoreDepartment);

// Permanent delete department
router.delete("/:id/permanent", permanentDeleteDepartment);

// Bulk delete departments
router.delete("/bulk/delete", bulkDeleteDepartments);

export default router;