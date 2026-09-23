import express from "express";
import {
  getAllWbsMasterData,
  getStagesPaginated,
  getWorksPaginated,
  getTasksPaginated,
  seedInitialData,
  createStage,
  updateStage,
  createWork,
  updateWork,
  createTask,
  updateTask,
  deleteStage,
  deleteWork,
  deleteTask
} from "../controllers/pmsWbs.controller.js";

const router = express.Router();

// Get all PMS WBS master data (Auto-seeds if database is empty)
router.get("/", getAllWbsMasterData);

// Seed or restore standard data
router.post("/seed", seedInitialData);

// Stage routes
router.get("/stages", getStagesPaginated);
router.post("/stages", createStage);
router.put("/stages/:id", updateStage);
router.delete("/stages/:id", deleteStage);

// Work routes
router.get("/works", getWorksPaginated);
router.post("/works", createWork);
router.put("/works/:id", updateWork);
router.delete("/works/:id", deleteWork);

// Task routes
router.get("/tasks", getTasksPaginated);
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

export default router;
