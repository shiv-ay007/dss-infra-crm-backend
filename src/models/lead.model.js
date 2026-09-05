import mongoose, { Schema } from "mongoose";

// Status Timeline Sub-schema (Kisne kiya, kab kiya, kya status kiya)
const statusTimelineSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: true }
);

const leadSchema = new Schema(
  {
    // Auto-generated ya Custom ID
    leadId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },

    // Lead Date
    date: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Lead Mode
    leadMode: {
      type: String,
      enum: [
        "Business Networking",
        "By Freelancer",
        "By Sales Team",
        "Customer to Customer",
        "Other"
      ],
      default: "By Sales Team",
      trim: true
    },

    // Lead Type
    leadType: {
      type: String,
      enum: ["FRESH", "REPEAT", "OLD", "RE-ENGAGED"],
      default: "FRESH",
      trim: true
    },

    // Work Category
    workCategory: {
      type: String,
      enum: [
        "Design",
        "Construction",
        "Interior",
        "Full Furnished",
        "Fabrication",
        "Other"
      ],
      default: "Design",
      trim: true
    },

    // Work Type (Multiple Drawing/Work selections)
    workType: [
      {
        type: String,
        trim: true
      }
    ],

    // Lead Status (Hot, Warm, Cold)
    leadStatus: {
      type: String,
      enum: ["Hot", "Warm", "Cold"],
      default: "Warm",
      index: true
    },

    intrestedStatus: {
      type: String,
      enum: ["Intrested", "Not Intersted", "Pending"],
      default: "Pending",
      index: true // (search/filter fast karne ke liye)
    },
    // Client Details
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true
    },
    alternateNumber: {
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

    // Address Details
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true
    },

    // Commercials & Details
    expectedBusiness: {
      type: Number,
      default: 0
    },
    projectDetail: {
      type: String,
      trim: true,
      default: ""
    },

    // ============================================
    // 🌟 EXTRA FIELDS
    // ============================================

    // Remarks text
    remarks: {
      type: String,
      trim: true,
      default: ""
    },

    // Cloudinary URL jisme file save hogi
    remarksFile: {
      type: String,
      default: ""
    },

    // Lead kis user ne create ki (User ObjectId)
    leadBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    // Table view se interested mark karne ke fields
    intrestedFromTableLead: {
      type: Boolean,
      default: false,
      index: true
    },
    intrestedFromTableLeadBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    intrestedFromTableLeadAt: {
      type: Date,
      default: null
    },

    // Status Timeline (Kisne kiya, kab kiya, kya kiya)
    statusTimeline: [statusTimelineSchema],

    // Soft delete & Status flags
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Search & filter indexes
leadSchema.index({ clientName: 1, isDeleted: 1 });
leadSchema.index({ phoneNumber: 1, isDeleted: 1 });
leadSchema.index({ city: 1, isDeleted: 1 });
leadSchema.index({ leadStatus: 1, isDeleted: 1 });
leadSchema.index({ leadBy: 1, isDeleted: 1 });
leadSchema.index({ intrestedFromTableLead: 1, isDeleted: 1 });
leadSchema.index({ clientName: "text", phoneNumber: "text", city: "text", leadId: "text" });

export const Lead = mongoose.model("Lead", leadSchema);