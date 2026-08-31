import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

const leadTransferSchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true
    },
    transferredFrom: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    transferredTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    reason: {
      type: String,
      trim: true
    },
    transferredBy: {
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

leadTransferSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

leadTransferSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

export const LeadTransfer = mongoose.model("LeadTransfer", leadTransferSchema);
