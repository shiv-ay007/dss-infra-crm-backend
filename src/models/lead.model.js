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

// Follow-up Media / Voice Attachment Sub-schema
const followupFileSchema = new Schema(
  {
    url: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    fileType: { type: String, default: "file" },
    size: { type: Number, default: 0 }
  },
  { _id: true }
);

// Follow-up Sub-schema
const followupSchema = new Schema(
  {
    // 1. Follow-up Type
    type: {
      type: String,
      enum: ["Call", "Meeting", "WhatsApp", "Email", "Site Visit"],
      default: "Call"
    },

    // 2. Scheduled Date & Time
    dateTime: {
      type: Date,
      default: null
    },

    // 3. Talk to Person & Designation
    talkToPerson: {
      type: String,
      trim: true,
      default: ""
    },
    personDesignation: {
      type: String,
      trim: true,
      default: ""
    },

    // 4. Current Discussion (Remarks/Text + Media/Voice Files)
    currentDiscussion: {
      discussion: {
        type: String,
        trim: true,
        default: ""
      },
      files: [followupFileSchema]
    },

    // 5. Next Discussion Topic (Text + Media/Voice Files)
    nextDiscussion: {
      nextDiscussion: {
        type: String,
        trim: true,
        default: ""
      },
      files: [followupFileSchema]
    },

    // 6. Client Rating (0 to 10)
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 4
    },

    // 7. Evaluation Matrix (Empty string default)
    matrix: {
      revenue: {
        type: String,
        trim: true,
        default: ""
      },
      satisfaction: {
        type: String,
        trim: true,
        default: ""
      },
      repeatPotential: {
        type: String,
        trim: true,
        default: ""
      },
      complexity: {
        type: String,
        trim: true,
        default: ""
      },
      engagement: {
        type: String,
        trim: true,
        default: ""
      },
      positiveAttitude: {
        type: String,
        trim: true,
        default: ""
      }
    },

    // 8. Follow-up Remarks (Speech note / Remark + Files)
    followupRemark: {
      remarks: {
        type: String,
        trim: true,
        default: ""
      },
      files: [followupFileSchema]
    },

    // Sales person / User who recorded this followup
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
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

    // Cloudinary URL jisme file save hogi (primary/first)
    remarksFile: {
      type: String,
      default: ""
    },

    // Multiple Cloudinary files (Images, Audio, Video, Docs)
    remarksFiles: [
      {
        url: { type: String, trim: true },
        fileType: { type: String, default: "image" },
        name: { type: String, trim: true },
        size: { type: Number, default: 0 }
      }
    ],

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

    // Follow-ups History & Schedule Records
    followups: [followupSchema],

    // Lead Management & Loss tracking flags
    inLeadManagement: {
      type: Boolean,
      default: false,
      index: true
    },
    isLoss: {
      type: Boolean,
      default: false,
      index: true
    },
    lossReason: {
      type: String,
      trim: true,
      default: ""
    },
    lossRemark: {
      type: String,
      trim: true,
      default: ""
    },

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