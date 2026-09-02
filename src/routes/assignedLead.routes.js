import { Router } from "express";
import {
  createAssignedLead,
  getAllAssignedLeads,
  getAssignedLeadById,
  updateAssignedLead,
  deleteAssignedLead
} from "../controllers/assignedLead.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public / flexible listing & creation
router.post("/", createAssignedLead);
router.get("/", getAllAssignedLeads);

router.use(verifyJWT);

router.get("/:id", getAssignedLeadById);
router.put("/:id", updateAssignedLead);
router.delete("/:id", deleteAssignedLead);

export default router;
