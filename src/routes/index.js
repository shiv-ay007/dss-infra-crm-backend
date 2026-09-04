import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import leadRoutes from "./lead.routes.js";
import followupRoutes from "./followup.routes.js";
import lossLeadRoutes from "./lossLead.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import uploadRoutes from "./upload.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/leads", leadRoutes);
router.use("/followups", followupRoutes);
router.use("/loss-leads", lossLeadRoutes);
router.use("/lossleads", lossLeadRoutes);
router.use("/losslead", lossLeadRoutes);
router.use("/loss_leads", lossLeadRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/uploads", uploadRoutes);

export default router;
