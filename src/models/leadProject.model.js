import mongoose, { Schema } from "mongoose";

const leadProjectSchema = new Schema(
  {
    // Lead MongoDB ObjectId reference
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      index: true
    },

    // 1. Client Details
    clientName: {
      type: String,
      required: [true, "Client Name is required"],
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, "Primary Phone Number is required"],
      trim: true,
      index: true
    },
    alternateNumber: {
      type: String,
      trim: true,
      default: ""
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: ""
    },
    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    clientDesignation: {
      type: String,
      trim: true,
      default: "Managing Director"
    },

    // 2. Business & Project Commercials
    projectName: {
      type: String,
      trim: true,
      default: ""
    },
    businessType: {
      type: String,
      trim: true,
      default: "Information Technology"
    },
    workCategory: {
      type: String,
      trim: true,
      default: "Design"
    },
    workType: [
      {
        type: String,
        trim: true
      }
    ],
    expectedBusiness: {
      type: Number,
      default: 0
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high"
    },
    jobType: {
      type: String,
      default: "NEW"
    },

    // 3. Location / Address
    city: {
      type: String,
      trim: true,
      default: ""
    },
    state: {
      type: String,
      trim: true,
      default: ""
    },
    pincode: {
      type: String,
      trim: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },

    // 4. Requirement & Transfer Remarks
    requirement: {
      type: String,
      trim: true,
      default: ""
    },
    transferRemark: {
      type: String,
      trim: true,
      default: ""
    },

    // 5. Assignment & Ratings
    clientRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.5
    },
    assignedTo: {
      type: String,
      trim: true,
      default: "Admin"
    },
    nextPersonName: {
      type: String,
      trim: true,
      default: ""
    },
    designation: {
      type: String,
      trim: true,
      default: ""
    },

    // 6. Management Flags & Status
    status: {
      type: String,
      enum: ["INTERESTED", "IN_PROGRESS", "CONVERTED", "LOST"],
      default: "INTERESTED"
    },
    inSalesManagement: {
      type: Boolean,
      default: true
    },
    isSalesTransferred: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: "leadsproject"
  }
);

// Search & Filter Indexing
leadProjectSchema.index({ clientName: "text", phoneNumber: "text", city: "text" });

export const LeadProject = mongoose.model("LeadProject", leadProjectSchema);
