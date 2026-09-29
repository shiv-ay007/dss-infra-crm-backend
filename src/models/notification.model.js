import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    // Targeted user (if null, broadcast to entire sales department)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    department: {
      type: String,
      default: "sales",
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: [
        "FOLLOWUP_DUE",
        "FOLLOWUP_OVERDUE",
        "NEW_LEAD",
        "STAGE_UPDATE",
        "PROJECT_ALERT",
        "SYSTEM"
      ],
      default: "FOLLOWUP_DUE",
      index: true
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },

    // Reference to related Lead or Project
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true
    },

    // Client Name / Identifier cached for instant display
    clientName: {
      type: String,
      trim: true,
      default: ""
    },

    // Frontend Route Link for seamless redirection on click
    link: {
      type: String,
      trim: true,
      default: ""
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    },

    isDismissed: {
      type: Boolean,
      default: false,
      index: true
    },

    dismissedAt: {
      type: Date,
      default: null
    },

    // Optional metadata payload
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for quick query of user's unread notifications
notificationSchema.index({ recipient: 1, department: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
