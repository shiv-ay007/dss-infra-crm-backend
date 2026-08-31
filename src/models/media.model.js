import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

export const MediaTypeEnum = {
  AUDIO: "AUDIO",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT"
};

const mediaSchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      index: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: Object.values(MediaTypeEnum),
      default: MediaTypeEnum.DOCUMENT
    },
    originalName: {
      type: String
    },
    size: {
      type: Number
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

mediaSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

mediaSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

export const Media = mongoose.model("Media", mediaSchema);
