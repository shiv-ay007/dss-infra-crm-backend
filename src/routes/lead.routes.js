import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  markInterestedFromTable,
  deleteLead
} from "../controllers/lead.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { optionalJWT, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// 1. Create Lead: Remarks file upload via Multer + optional/verify JWT
router.post("/", optionalJWT, upload.single("remarksFile"), createLead);

// 2. Get All Leads (with search & filters)
router.get("/", getAllLeads);

// 3. Get Single Lead by ID or leadId
router.get("/:id", getLeadById);

// 4. Update Lead (also supports updating remarksFile via upload)
router.put("/:id", optionalJWT, upload.single("remarksFile"), updateLead);

// 5. Quick Status Update with Status Timeline log
router.patch("/:id/status", optionalJWT, updateLeadStatus);

// 6. Mark / Unmark Interested from Table Lead
router.patch("/:id/interested", optionalJWT, markInterestedFromTable);

// 7. Soft Delete Lead
router.delete("/:id", optionalJWT, deleteLead);

export default router;