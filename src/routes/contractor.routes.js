import express from "express";
import {
  createContractor,
  getAllContractors,
  getContractorById,
  updateContractor,
  deleteContractor
} from "../controllers/contractor.controller.js";

const router = express.Router();

router.route("/")
  .post(createContractor)
  .get(getAllContractors);

router.route("/:id")
  .get(getContractorById)
  .put(updateContractor)
  .delete(deleteContractor);

export default router;
