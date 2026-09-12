import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import branchRoutes from "./branch.routes.js";
import departmentRoutes from "./department.routes.js";
import leadRoutes from "./lead.routes.js";
import followupRoutes from "./followup.routes.js";
import uploadRoutes from "./upload.routes.js";
import leadProjectRoutes from "./leadProject.routes.js";
import supplierRoutes from "./supplier.routes.js";
import contractorRoutes from "./contractor.routes.js";
import materialRoutes from "./material.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/branches", branchRoutes);
router.use("/departments", departmentRoutes);
router.use("/leads", leadRoutes);
router.use("/followups", followupRoutes);
router.use("/uploads", uploadRoutes);
router.use("/lead-projects", leadProjectRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/contractors", contractorRoutes);
router.use("/materials", materialRoutes);

export default router;
