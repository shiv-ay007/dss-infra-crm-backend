import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

const lossLeadSchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      index: true
    },
    leadId: {
      type: String
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    alternateNumber: {
      type: String
    },
    emailAddress: {
      type: String,
      lowercase: true,
      trim: true
    },
    workCategory: {
      type: String
    },
    workType: [
      {
        type: String
      }
    ],
    address: { type: String },
    city: { type: String },
    pincode: { type: String },
    state: { type: String },
    projectDetail: { type: String },
    notes: { type: String },
    requirement: { type: String },
    salesPerson: { type: String },
    leadMode: { type: String },
    leadType: { type: String, default: "LOSS" },
    expectedBusiness: {
      type: Number,
      default: 0
    },
    budget: {
      type: Number,
      default: 0
    },
    lossReason: {
      type: String,
      default: "Loss lead registered",
      trim: true
    },
    lossRemark: {
      type: String,
      default: "",
      trim: true
    },
    lossDate: {
      type: Date,
      default: Date.now
    },
    // Alias fields for frontend compatibility
    phone: { type: String },
    email: { type: String },
    name: { type: String },
    status: { type: String, default: "CLOSED_LOST" },
    reason: { type: String },
    remark: { type: String },

    assignedTo: {
      type: Schema.Types.Mixed,
      default: null,
      index: true
    },
    assignedBy: {
      type: Schema.Types.Mixed,
      default: null
    },
    createdBy: {
      type: Schema.Types.Mixed,
      required: false,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

lossLeadSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

lossLeadSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

lossLeadSchema.virtual("lossDateIST").get(function () {
  return formatISTDate(this.lossDate);
});

export const LossLead = mongoose.model("LossLead", lossLeadSchema);
