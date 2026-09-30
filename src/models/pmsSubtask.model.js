import mongoose, { Schema } from "mongoose";

const pmsSubtaskSchema = new Schema(
  {
    subtask_code: {
      type: String,
      required: [true, "Subtask Code is required"],
      trim: true,
      uppercase: true,
      index: true
    },
    subtask_name: {
      type: String,
      required: [true, "Subtask Name is required"],
      trim: true
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

export const PmsSubtask = mongoose.model("PmsSubtask", pmsSubtaskSchema, "pms_subtasks");
