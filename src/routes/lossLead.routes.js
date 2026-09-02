import { Router } from "express";
import {
  createLossLead,
  getAllLossLeads,
  getLossLeadById,
  updateLossLead,
  deleteLossLead
} from "../controllers/lossLead.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Allow public or protected creation & listing depending on requirements
router.post("/", createLossLead);
router.get("/", getAllLossLeads);

router.use(verifyJWT);

router.get("/:id", getLossLeadById);
router.put("/:id", updateLossLead);
router.delete("/:id", deleteLossLead);

export default router;
