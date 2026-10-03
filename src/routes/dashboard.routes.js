import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { optionalJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(optionalJWT);

// GET /api/v1/dashboard/summary
router.get("/summary", getDashboardSummary);

export default router;
