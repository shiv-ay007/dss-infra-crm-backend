import { Router } from "express";
import {
  addFollowup,
  getAllFollowups,
  getLeadFollowups,
  updateFollowup,
  deleteFollowup
} from "../controllers/followup.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", addFollowup);
router.get("/", getAllFollowups);
router.get("/lead/:leadId", getLeadFollowups);
router.put("/:id", updateFollowup);
router.delete("/:id", deleteFollowup);

export default router;
