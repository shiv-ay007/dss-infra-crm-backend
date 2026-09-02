import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLossLeads,
  getFollowupLeads,
  markLeadAsLoss,
  getLeadById,
  updateLead,
  assignLead,
  updateLeadStatus,
  deleteLead
} from "../controllers/lead.controller.js";
import { createLossLead } from "../controllers/lossLead.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../models/user.model.js";

const router = Router();

// Public routes for lead creation & fetching
router.post("/", createLead);
router.get("/", getAllLeads);
router.get("/loss", getLossLeads);
router.get("/lossleads", getLossLeads);
router.get("/loss-leads", getLossLeads);
router.post("/loss", createLossLead);
router.post("/lossleads", createLossLead);
router.post("/loss-leads", createLossLead);
router.get("/followup-leads", getFollowupLeads);
router.get("/followups", getFollowupLeads);

// Protected routes below
router.use(verifyJWT);

router.post("/:id/loss", markLeadAsLoss);
router.patch("/:id/loss", markLeadAsLoss);
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
