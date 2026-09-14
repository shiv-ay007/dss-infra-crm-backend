import mongoose, { Schema } from "mongoose";

const pmsStageSchema = new Schema(
  {
    stage_code: {
      type: String,
      required: [true, "Stage Code is required"],
      trim: true,
      uppercase: true,
      index: true
    },
    stage_name: {
      type: String,
      required: [true, "Stage Name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    order: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const PmsStage = mongoose.model("PmsStage", pmsStageSchema, "pms_stages");
