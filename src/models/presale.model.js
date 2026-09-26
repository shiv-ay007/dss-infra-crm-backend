import mongoose, { Schema } from "mongoose";

/* =========================================================
   1. PROJECT DETAILS SUB-SCHEMA
   ========================================================= */
const projectDetailsSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "LeadProject",
      required: [true, "Project ID is required"]
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead"
    },
    clientName: {
      type: String,
      trim: true,
      default: ""
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ""
    },
    projectName: {
      type: String,
      trim: true,
      default: ""
    },
    currentActivePerson: {
      type: String,
      trim: true,
      default: "Admin"
    },
    currentActiveUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    projectStatus: {
      type: String,
      enum: [
        "On Track",
        "Hold (By Client)",
        "Delay (By Company)",
        "Delay (By Client)",
        "Hold (By Company)",
        "OUT"
      ],
      default: "On Track"
    },
    projectSubStatus: {
      type: String,
      trim: true,
      default: "VISIT"
    },
    // Scope upgradeable: Consultancy Only (1-2), Design Only (1-10), Design + Construction (1-11)
    engagementScope: {
      type: String,
      enum: ["Consultancy Only", "Design Only", "Design + Construction"],
      set: (val) => {
        if (!val || typeof val !== "string") return "Design + Construction";
        const s = val.toLowerCase().trim();
        if (s.includes("consult")) return "Consultancy Only";
        if (s.includes("design") && !s.includes("construct")) return "Design Only";
        return "Design + Construction";
      },
      default: "Design + Construction"
    },
    currentStageId: {
      type: Number,
      default: 1,
      min: 1,
      max: 11
    },
    currentStageName: {
      type: String,
      trim: true,
      default: "Visit"
    },
    totalStages: {
      type: Number,
      default: 11
    },
    completedStages: {
      type: Number,
      default: 0,
      min: 0,
      max: 11
    }
  },
  { _id: false }
);

/* =========================================================
   2. STAGE SUB-SCHEMA
   ========================================================= */
const presaleStageSchema = new Schema(
  {
    stageId: {
      type: Number,
      required: true,
      min: 1,
      max: 11
    },
    stageName: {
      type: String,
      required: true,
      trim: true
    },
    /*
      pending   = Stage abhi start nahi hua
      active    = Current working stage
      completed = Stage complete ho gaya
      skipped   = Scope ke bahar ya N/A
      rejected  = Client ne reject kar diya
    */
    status: {
      type: String,
      enum: ["pending", "active", "completed", "skipped", "rejected"],
      default: "pending"
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    },
    completedAt: {
      type: Date,
      default: null
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    completedByName: {
      type: String,
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

/* =========================================================
   3. STAGE HISTORY AUDIT SUB-SCHEMA
   ========================================================= */
const stageHistorySchema = new Schema(
  {
    stageId: {
      type: Number,
      required: true
    },
    stageName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: ["started", "updated", "completed", "closed_here", "reopened"],
      default: "updated"
    },
    savedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    savedByName: {
      type: String,
      default: "Admin"
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    stageSnapshot: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: true }
);

/* =========================================================
   4. REMARKS / DISCUSSION LOG SUB-SCHEMA
   ========================================================= */
const presaleRemarkSchema = new Schema(
  {
    stageId: {
      type: Number,
      default: 1,
      index: true
    },
    stageName: {
      type: String,
      trim: true,
      default: "Visit"
    },
    author: {
      type: String,
      trim: true,
      default: "Admin"
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    text: {
      type: String,
      trim: true,
      default: ""
    },
    attachments: [
      {
        name: {
          type: String,
          trim: true
        },
        type: {
          type: String,
          default: "file"
        },
        url: {
          type: String,
          trim: true
        },
        publicId: {
          type: String,
          default: ""
        },
        size: {
          type: Number,
          default: 0
        }
      }
    ],
    dateTime: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

/* =========================================================
   5. MAIN PRESALE SCHEMA
   ========================================================= */
const presaleSchema = new Schema(
  {
    projectDetails: {
      type: projectDetailsSchema,
      required: true
    },
    stages: {
      type: [presaleStageSchema],
      default: []
    },
    stageHistory: {
      type: [stageHistorySchema],
      default: []
    },
    remarks: {
      type: [presaleRemarkSchema],
      default: []
    },
    presaleStatus: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "On Hold", "Closed"],
      default: "In Progress"
    },
    closureReason: {
      type: String,
      default: null
    },
    closedAtStage: {
      type: Number,
      default: null
    },

    // Audit Info
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    createdByName: {
      type: String,
      default: "Admin"
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    updatedByName: {
      type: String,
      default: "Admin"
    }
  },
  {
    timestamps: true,
    collection: "presales"
  }
);

/* =========================================================
   6. INDEXES
   ========================================================= */
presaleSchema.index({ "projectDetails.projectId": 1 });
presaleSchema.index({ "projectDetails.leadId": 1 });
presaleSchema.index({ "projectDetails.currentStageId": 1 });
presaleSchema.index({ "projectDetails.projectStatus": 1 });
presaleSchema.index({ presaleStatus: 1 });

/* =========================================================
   7. MODEL
   ========================================================= */
export const Presale = mongoose.model("Presale", presaleSchema);
