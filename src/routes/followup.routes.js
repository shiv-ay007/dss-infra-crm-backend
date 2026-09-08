import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Lead } from "../models/lead.model.js";
import { addLeadFollowup } from "../controllers/lead.controller.js";
import { optionalJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

const uploadFollowupFiles = upload.fields([
  { name: "currentFiles", maxCount: 10 },
  { name: "nextFiles", maxCount: 10 },
  { name: "remarkFiles", maxCount: 10 }
]);

// 1. GET all followups across leads
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const leads = await Lead.find({
      isDeleted: false,
      "followups.0": { $exists: true }
    })
      .select("clientName phoneNumber leadId followups salesPerson")
      .sort({ updatedAt: -1 });

    const allFollowups = [];
    leads.forEach((l) => {
      (l.followups || []).forEach((f) => {
        allFollowups.push({
          ...f.toObject(),
          lead: {
            _id: l._id,
            leadId: l.leadId,
            clientName: l.clientName,
            phoneNumber: l.phoneNumber
          }
        });
      });
    });

    return res.status(200).json(
      new ApiResponse(200, { followups: allFollowups }, "Followups fetched successfully")
    );
  })
);

// 2. POST followup via /followups with leadId (supports Cloudinary file uploads)
router.post(
  "/",
  optionalJWT,
  uploadFollowupFiles,
  asyncHandler(async (req, res, next) => {
    let bodyData = req.body;
    if (req.body.data) {
      try {
        bodyData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
      } catch {}
    }
    const leadId = req.body.leadId || bodyData?.leadId || req.body.id || req.body._id;
    if (!leadId) {
      return res.status(400).json({ success: false, message: "leadId is required to add follow-up" });
    }
    req.params.id = leadId;
    return addLeadFollowup(req, res, next);
  })
);

// 3. GET followups for a specific lead: /followups/lead/:leadId
router.get(
  "/lead/:leadId",
  asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const lead = await Lead.findOne({
      $or: [{ _id: leadId }, { leadId: leadId.toUpperCase() }],
      isDeleted: false
    }).select("clientName phoneNumber leadId followups");

    return res.status(200).json(
      new ApiResponse(200, { followups: lead?.followups || [] }, "Lead followups fetched successfully")
    );
  })
);

export default router;
