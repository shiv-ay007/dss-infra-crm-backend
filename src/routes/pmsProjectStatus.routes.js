import express from "express";
import {
  getAllProjectStatuses,
  getStatusesPaginated,
  createProjectStatus,
  updateProjectStatus,
  deleteProjectStatus,
  seedDefaultStatuses
} from "../controllers/pmsProjectStatus.controller.js";

const router = express.Router();

// 1. Get all active statuses (for form dropdowns)
router.get("/all", getAllProjectStatuses);

// 2. Seed default project statuses
router.post("/seed", seedDefaultStatuses);

// 3. Paginated & Filtered (for Master Table)
router.get("/", getStatusesPaginated);

// 4. Create new status
router.post("/", createProjectStatus);

// 5. Update status
router.put("/:id", updateProjectStatus);

// 6. Delete status (soft delete)
router.delete("/:id", deleteProjectStatus);

export default router;
