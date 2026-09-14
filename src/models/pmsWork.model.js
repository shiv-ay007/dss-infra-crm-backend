import mongoose, { Schema } from "mongoose";

const pmsWorkSchema = new Schema(
  {
    stage_id: {
      type: Schema.Types.ObjectId,
      ref: "PmsStage",
      required: [true, "Stage ID is required"],
      index: true
    },
    stage_code: {
      type: String,
      trim: true,
      uppercase: true
    },
    work_code: {
      type: String,
      required: [true, "Work Code is required"],
      trim: true,
      uppercase: true,
      index: true
    },
    work_name: {
      type: String,
      required: [true, "Work Name is required"],
      trim: true
    },
    contractor_type: {
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

export const PmsWork = mongoose.model("PmsWork", pmsWorkSchema, "pms_works");
