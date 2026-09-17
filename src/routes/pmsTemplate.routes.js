import express from "express";
import {
  createPmsTemplate,
  getAllPmsTemplates,
  getPmsTemplateById,
  updatePmsTemplate,
  deletePmsTemplate
} from "../controllers/pmsTemplate.controller.js";

const router = express.Router();

router.route("/")
  .post(createPmsTemplate)
  .get(getAllPmsTemplates);

router.route("/:id")
  .get(getPmsTemplateById)
  .put(updatePmsTemplate)
  .delete(deletePmsTemplate);

export default router;
