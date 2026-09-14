import mongoose, { Schema } from "mongoose";

const pmsTaskSchema = new Schema(
  {
    work_id: {
      type: Schema.Types.ObjectId,
      ref: "PmsWork",
      required: [true, "Work ID is required"],
      index: true
    },
    work_code: {
      type: String,
      trim: true,
      uppercase: true
    },
    stage_id: {
      type: Schema.Types.ObjectId,
      ref: "PmsStage",
      index: true
    },
    stage_code: {
      type: String,
      trim: true,
      uppercase: true
    },
    task_code: {
      type: String,
      required: [true, "Task Code is required"],
      trim: true,
      uppercase: true,
      index: true
    },
    task_name: {
      type: String,
      required: [true, "Task Name is required"],
      trim: true
    },
    work_done_by: {
      type: String,
      trim: true,
      default: ""
    },
    contractor_type: {
      type: String,
      trim: true,
      default: ""
    },
    tools: {
      type: String,
      trim: true,
      default: ""
    },
    materials: {
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

export const PmsTask = mongoose.model("PmsTask", pmsTaskSchema, "pms_tasks");
