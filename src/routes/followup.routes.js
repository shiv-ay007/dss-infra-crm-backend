import { Router } from "express";
import {
  addFollowup,
  getAllFollowups,
  getLeadFollowups,
  updateFollowup,
  deleteFollowup
} from "../controllers/followup.controller.js";
import { optionalJWT, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", optionalJWT, addFollowup);
router.get("/", optionalJWT, getAllFollowups);
router.get("/lead/:leadId", optionalJWT, getLeadFollowups);
router.put("/:id", optionalJWT, updateFollowup);
router.delete("/:id", verifyJWT, deleteFollowup);

export default router;
