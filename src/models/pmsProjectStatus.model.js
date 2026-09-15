import mongoose, { Schema } from "mongoose";

const pmsProjectStatusSchema = new Schema(
  {
    status_code: {
      type: String,
      required: [true, "Status Code is required"],
      trim: true,
      uppercase: true,
      index: true
    },
    status_name: {
      type: String,
      required: [true, "Status Name is required"],
      trim: true
    },
    color: {
      type: String,
      default: "#3B82F6",
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

export const PmsProjectStatus = mongoose.model(
  "PmsProjectStatus",
  pmsProjectStatusSchema,
  "pms_project_statuses"
);
