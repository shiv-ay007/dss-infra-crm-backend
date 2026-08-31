import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

export const FollowupStatusEnum = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  MISSED: "MISSED"
};

const followupSchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true
    },
    remarks: {
      type: String,
      required: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(FollowupStatusEnum),
      default: FollowupStatusEnum.SCHEDULED
    },
    createdBy: {
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

followupSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

followupSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

followupSchema.virtual("scheduledDateIST").get(function () {
  return formatISTDate(this.scheduledDate);
});

export const Followup = mongoose.model("Followup", followupSchema);
