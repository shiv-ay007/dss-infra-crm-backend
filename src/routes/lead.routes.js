import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  markInterestedFromTable,
  deleteLead,
  getDeletedLeads,
  restoreLead,
  addLeadFollowup
} from "../controllers/lead.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { optionalJWT, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Multer middleware supporting both multiple remarksFiles and single remarksFile
const uploadRemarksFiles = upload.fields([
  { name: "remarksFiles", maxCount: 10 },
  { name: "remarksFile", maxCount: 1 }
]);

// 1. Create Lead: Remarks file(s) upload via Multer + optional JWT
router.post("/", optionalJWT, uploadRemarksFiles, createLead);

// 2. Get All Leads (with search & filters)
router.get("/", getAllLeads);

// 2.1 Get Deleted Leads (Only leads where isDeleted === 1 / true)
router.get("/deleted", optionalJWT, getDeletedLeads);

// 3. Get Single Lead by ID or leadId
router.get("/:id", getLeadById);

// 4. Update Lead (supports updating remarksFile(s) via upload)
router.put("/:id", optionalJWT, uploadRemarksFiles, updateLead);

// 5. Quick Status Update with Status Timeline log
router.patch("/:id/status", optionalJWT, updateLeadStatus);

// 6. Mark / Unmark Interested from Table Lead
router.patch("/:id/interested", optionalJWT, markInterestedFromTable);

// 7. Soft Delete Lead
router.delete("/:id", optionalJWT, deleteLead);

// 7.1 Restore Deleted Lead
router.patch("/:id/restore", optionalJWT, restoreLead);

// Follow-up Media uploads middleware for Multer
const uploadFollowupFiles = upload.fields([
  { name: "currentFiles", maxCount: 10 },
  { name: "nextFiles", maxCount: 10 },
  { name: "remarkFiles", maxCount: 10 }
]);

// 8. Add Follow-up to Lead (New Schema with Cloudinary uploads)
router.post("/:id/followups", optionalJWT, uploadFollowupFiles, addLeadFollowup);

export default router;