import { Router } from "express";
import {
  getPaymentSummaryByProjects,
  getProjectPayments,
  createPayment,
  updatePayment,
  deletePayment
} from "../controllers/payment.controller.js";
import { optionalJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Populate req.user if available
router.use(optionalJWT);

// 1. Projects Financial Overview & Summary (With server-side search, mode, date filters)
router.get("/summary", getPaymentSummaryByProjects);

// 2. Specific Project Payment Passbook & History
router.get("/project/:projectId", getProjectPayments);

// 3. Add New Payment Record (Create)
router.post("/", createPayment);

// 4. Update Payment Record (Edit)
router.put("/:id", updatePayment);

// 5. Delete Payment Record
router.delete("/:id", deletePayment);

export default router;
