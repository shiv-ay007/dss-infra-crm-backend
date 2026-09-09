import { Router } from "express";
import {
  createLeadProject,
  getAllLeadProjects,
  getLeadProjectById,
  updateLeadProject
} from "../controllers/leadProject.controller.js";

const router = Router();

// POST /api/v1/lead-projects (Create) & GET /api/v1/lead-projects (List)
router.route("/").post(createLeadProject).get(getAllLeadProjects);

// GET /api/v1/lead-projects/:id & PUT /api/v1/lead-projects/:id
router.route("/:id").get(getLeadProjectById).put(updateLeadProject);

export default router;
