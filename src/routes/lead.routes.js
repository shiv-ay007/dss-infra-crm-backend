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
import { verifyJWT, authorizeRoles, optionalJWT } from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../models/user.model.js";

const router = Router();

// Public routes for lead creation & fetching
router.post("/", optionalJWT, createLead);
router.get("/", getAllLeads);
router.get("/loss", getLossLeads);
router.get("/lossleads", getLossLeads);
router.get("/loss-leads", getLossLeads);
router.post("/loss", optionalJWT, createLossLead);
router.post("/lossleads", optionalJWT, createLossLead);
router.post("/loss-leads", optionalJWT, createLossLead);
router.get("/followup-leads", optionalJWT, getFollowupLeads);
router.get("/followups", optionalJWT, getFollowupLeads);

router.post("/:id/loss", optionalJWT, markLeadAsLoss);
router.patch("/:id/loss", optionalJWT, markLeadAsLoss);
router.get("/:id", optionalJWT, getLeadById);
router.put("/:id", optionalJWT, updateLead);
router.patch("/:id/status", optionalJWT, updateLeadStatus);

// Protected routes below
router.use(verifyJWT);

// Re-assignment allowed by Admin and Manager
router.patch(
  "/:id/assign",
  authorizeRoles(UserRolesEnum.ADMIN, UserRolesEnum.MANAGER),
  assignLead
);

router.delete("/:id", authorizeRoles(UserRolesEnum.ADMIN), deleteLead);

export default router;
