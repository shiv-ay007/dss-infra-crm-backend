import { uploadOnCloudinary } from "../config/cloudinary.js";
import { Media } from "../models/media.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadMediaFile = asyncHandler(async (req, res) => {
  const { leadId, fileType } = req.body;
  const localFilePath = req.file?.path;

  if (!localFilePath) {
    throw new ApiError(400, "File is missing for upload");
  }

  const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

  if (!cloudinaryResponse) {
    throw new ApiError(500, "Failed to upload file to Cloudinary");
  }

  const media = await Media.create({
    lead: leadId || null,
    url: cloudinaryResponse.secure_url,
    publicId: cloudinaryResponse.public_id,
    fileType: fileType || "DOCUMENT",
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedBy: req.user?._id || null
  });

  return res
    .status(201)
    .json(new ApiResponse(201, media, "File uploaded successfully"));
});

export const getLeadMedia = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const mediaFiles = await Media.find({ lead: leadId })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, mediaFiles, "Lead media files retrieved"));
});
