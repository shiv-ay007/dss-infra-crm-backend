import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  assignLead,
  updateLeadStatus,
  deleteLead
} from "../controllers/lead.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../models/user.model.js";

const router = Router();

// Public routes for lead creation & fetching
router.post("/", createLead);
router.get("/", getAllLeads);

// Protected routes below
router.use(verifyJWT);

router.get("/:id", getLeadById);
router.put("/:id", updateLead);
router.patch("/:id/status", updateLeadStatus);

// Re-assignment allowed by Admin and Manager
router.patch(
  "/:id/assign",
  authorizeRoles(UserRolesEnum.ADMIN, UserRolesEnum.MANAGER),
  assignLead
);

router.delete("/:id", authorizeRoles(UserRolesEnum.ADMIN), deleteLead);

export default router;
