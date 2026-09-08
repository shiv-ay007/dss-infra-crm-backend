import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

// POST /api/v1/uploads: Upload files/audio to Cloudinary
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: 10 }]),
  asyncHandler(async (req, res) => {
    const filesToUpload = [];
    if (req.files?.file) filesToUpload.push(...req.files.file);
    if (req.files?.files) filesToUpload.push(...req.files.files);
    if (req.file) filesToUpload.push(req.file);

    if (filesToUpload.length === 0) {
      throw new ApiError(400, "No file provided for upload");
    }

    const uploadedResults = [];
    for (const f of filesToUpload) {
      const result = await uploadOnCloudinary(f.path);
      if (result?.secure_url) {
        const mime = f.mimetype || "";
        const fileType = mime.startsWith("image/")
          ? "image"
          : mime.startsWith("audio/") || mime.includes("webm") || mime.includes("wav") || mime.includes("ogg") || mime.includes("mp3")
          ? "audio"
          : mime.startsWith("video/")
          ? "video"
          : "document";

        uploadedResults.push({
          url: result.secure_url,
          public_id: result.public_id,
          name: f.originalname || "attachment",
          fileType,
          size: f.size || 0
        });
      }
    }

    if (uploadedResults.length === 0) {
      throw new ApiError(500, "Failed to upload file(s) to Cloudinary");
    }

    const data = uploadedResults.length === 1 ? uploadedResults[0] : uploadedResults;
    return res.status(200).json(new ApiResponse(200, data, "File(s) uploaded successfully to Cloudinary"));
  })
);

export default router;
