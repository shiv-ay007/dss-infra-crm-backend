import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "LeadProject",
      required: [true, "Project reference is required"],
      index: true
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null
    },
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      index: true
    },
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      index: true
    },
    totalDealValue: {
      type: Number,
      default: 0
    },
    paymentType: {
      type: String,
      enum: ["Token", "Advance", "Milestone Payment", "Final Payment"],
      required: [true, "Payment type is required"],
      index: true
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount must be greater than or equal to 0"]
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque"],
      required: [true, "Payment mode is required"],
      index: true
    },
    dateReceived: {
      type: Date,
      required: [true, "Date received is required"],
      index: true
    },
    receivedBy: {
      type: String,
      required: [true, "Received by staff name is required"],
      trim: true
    },
    remark: {
      type: String,
      default: "",
      trim: true
    },
    remarksFiles: [
      {
        url: { type: String, trim: true },
        fileType: { type: String, default: "image" },
        name: { type: String, trim: true },
        size: { type: Number, default: 0 },
        public_id: { type: String, default: "" }
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    createdByName: {
      type: String,
      default: ""
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    collection: "payments"
  }
);

// High performance compound indexes for fast server-side querying and sorting
paymentSchema.index({ projectId: 1, dateReceived: -1 });
paymentSchema.index({ clientName: 1, dateReceived: -1 });
paymentSchema.index({ dateReceived: -1, paymentMode: 1 });
paymentSchema.index({ dateReceived: -1, paymentType: 1 });

// Full text index for multi-field search
paymentSchema.index({
  clientName: "text",
  projectName: "text",
  remark: "text"
});

export const Payment = mongoose.model("Payment", paymentSchema);
