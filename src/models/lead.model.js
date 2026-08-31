import mongoose, { Schema } from "mongoose";
import { formatISTDate } from "../utils/dateHelper.js";

export const LeadStatusEnum = {
  NEW: "NEW",
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
  CONTACTED: "CONTACTED",
  IN_PROGRESS: "IN_PROGRESS",
  QUALIFIED: "QUALIFIED",
  UNQUALIFIED: "UNQUALIFIED",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST"
};

export const LeadPriorityEnum = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT"
};

const attachmentSchema = new Schema({
  id: String,
  name: String,
  type: String, // 'image', 'audio', 'video', 'document'
  url: String,  // Cloudinary / base64 URL
  publicId: String,
  size: Number
});

const leadSchema = new Schema(
  {
    date: {
      type: String
    },
    leadMode: {
      type: String
    },
    leadType: {
      type: String,
      default: "FRESH"
    },
    workCategory: {
      type: String
    },
    workType: [
      {
        type: String
      }
    ],
    leadStatus: {
      type: String,
      default: "Warm"
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
    address: {
      type: String
    },
    city: {
      type: String
    },
    pincode: {
      type: String
    },
    state: {
      type: String
    },
    expectedBusiness: {
      type: Number,
      default: 0
    },
    projectDetail: {
      type: String
    },
    remark: {
      type: String
    },
    remarkAttachments: [attachmentSchema],

    // Backward compatibility aliases
    phone: { type: String },
    email: { type: String },
    status: { type: String },
    source: { type: String },
    budget: { type: Number },
    notes: { type: String },
    
    // Additional AddLead form fields
    leadSource: { type: String },
    channel: { type: String, default: "Sales" },
    jobType: { type: String, default: "NEW" },
    clientType: { type: String, default: "Individual" },
    clientDesignation: { type: String },
    leadLabel: { type: String },
    whatsappNumber: { type: String },
    googleLocation: { type: String },
    salesPerson: { type: String, default: "Sales TL (Current User)" },
    requirement: { type: String },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    nextFollowupDate: {
      type: Date
    },

    // Timestamp & Action Tracking Fields (IST)
    lastActionDate: { type: String },
    lastActionTime: { type: String },
    lastActionType: { type: String },
    lastActionRemark: { type: String },
    lastActionIST: { type: String },
    actionHistory: [
      {
        actionType: String,
        description: String,
        remark: String,
        date: String,
        time: String,
        timestampIST: String,
        performedBy: String
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

leadSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

leadSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

export const Lead = mongoose.model("Lead", leadSchema);
