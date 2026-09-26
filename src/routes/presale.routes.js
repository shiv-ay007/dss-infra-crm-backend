import { Router } from "express";
import {
  getPresaleByProjectId,
  saveStageData,
  addPresaleRemarkWithCloudinary,
  closePresale
} from "../controllers/presale.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { optionalJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply optionalJWT so req.user is set when logged in
router.use(optionalJWT);

// 1. Get Presale record by LeadProject ID
router.get("/:projectId", getPresaleByProjectId);

// 2. Save Stage Data (validates sequential gating, scope, rejection, audit log)
router.put("/save-stage", saveStageData);

// 3. Add Discussion Remark with Cloudinary file/audio upload (Multer accepts up to 10 files)
router.post(
  "/:projectId/remark",
  upload.array("files", 10),
  addPresaleRemarkWithCloudinary
);

// 4. Mark Presale as Closed at any stage with reason, remark & Cloudinary media
router.post(
  "/:projectId/close",
  upload.array("files", 10),
  closePresale
);

export default router;
