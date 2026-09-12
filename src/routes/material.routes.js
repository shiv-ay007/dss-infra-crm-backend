import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial
} from "../controllers/material.controller.js";

const router = Router();

// Routes
router.route("/")
  .post(upload.array("documents", 5), createMaterial)
  .get(getAllMaterials);

router.route("/:id")
  .get(getMaterialById)
  .put(upload.array("documents", 5), updateMaterial)
  .delete(deleteMaterial);

export default router;
