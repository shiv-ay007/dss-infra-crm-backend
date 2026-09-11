import express from "express";
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
} from "../controllers/supplier.controller.js";

const router = express.Router();

router.route("/")
  .post(createSupplier)
  .get(getAllSuppliers);

router.route("/:id")
  .get(getSupplierById)
  .put(updateSupplier)
  .delete(deleteSupplier);

export default router;
