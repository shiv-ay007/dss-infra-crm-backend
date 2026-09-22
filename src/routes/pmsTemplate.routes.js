import express from "express";
import {
  createPmsTemplate,
  getAllPmsTemplates,
  getPmsTemplateById,
  updatePmsTemplate,
  deletePmsTemplate,
  addExecutionTracking
} from "../controllers/pmsTemplate.controller.js";

const router = express.Router();

router.route("/")
  .post(createPmsTemplate)
  .get(getAllPmsTemplates);

router.route("/:id")
  .get(getPmsTemplateById)
  .put(updatePmsTemplate)
  .delete(deletePmsTemplate);

// Module: Active Projects Execution Tracking
router.route("/:id/execution-tracking")
  .post(addExecutionTracking);

export default router;
