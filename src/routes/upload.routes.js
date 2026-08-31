import { Router } from "express";
import {
  uploadMediaFile,
  getLeadMedia
} from "../controllers/upload.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", upload.single("file"), uploadMediaFile);
router.get("/lead/:leadId", getLeadMedia);

export default router;
