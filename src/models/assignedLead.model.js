import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

const assignedLeadSchema = new Schema(
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
    leadMode: { type: String },
    leadType: { type: String, default: "FRESH" },
    expectedBusiness: {
      type: Number,
      default: 0
    },
    budget: {
      type: Number,
      default: 0
    },
    salesPerson: {
      type: String,
      trim: true
    },
    assignTo: {
      type: String,
      trim: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    isAssigned: {
      type: Boolean,
      default: true
    },
    isLoss: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      default: "Warm"
    },
    leadStatus: {
      type: String,
      default: "Warm"
    },
    remark: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    remarkAttachments: [
      {
        type: Schema.Types.Mixed
      }
    ],
    // Alias fields for frontend compatibility
    phone: { type: String },
    email: { type: String },
    name: { type: String },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

assignedLeadSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

assignedLeadSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

assignedLeadSchema.virtual("assignedDateIST").get(function () {
  return formatISTDate(this.assignedDate);
});

export const AssignedLead = mongoose.model("AssignedLead", assignedLeadSchema);
