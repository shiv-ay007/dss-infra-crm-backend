import mongoose, { Schema } from "mongoose";

// Reusable Field Data Schema
const fieldDataSchema = new Schema(
  {
    workWillDoneBy: {
      type: String,
      trim: true,
      default: ""
    },

    contractorId: {
      type: Schema.Types.ObjectId,
      ref: "Contractor",
      default: null
    },

    toolsVehicles: [
      {
        type: String,
        trim: true
      }
    ],

    // Material & Supplier Details
    materialSupplier: [
      {
        materialId: {
          type: Schema.Types.ObjectId,
          ref: "Material",
          default: null
        },
        materialName: {
          type: String,
          trim: true,
          default: ""
        },
        materialRequired: {
          type: String,
          trim: true,
          default: ""
        },
        supplierId: {
          type: Schema.Types.ObjectId,
          ref: "Supplier",
          default: null
        },
        supplierName: {
          type: String,
          trim: true,
          default: ""
        },
        supplierType: {
          type: String,
          trim: true,
          default: ""
        }
      }
    ],

    maxTimeToComplete: {
      type: String,
      trim: true,
      default: "3"
    },

    timeUnit: {
      type: String,
      trim: true,
      default: "Days"
    },

    deadlineDate: {
      type: Date,
      default: null
    },

    durationDays: {
      type: Number,
      default: 3
    },

    durationHours: {
      type: Number,
      default: 0
    },

    durationFormatted: {
      type: String,
      trim: true,
      default: "3 D ; 0 H"
    },

    instruction: {
      type: String,
      trim: true,
      default: ""
    },

    remark: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    _id: false
  }
);

const pmsTemplateSchema = new Schema(
  {
    // 1. Lead & Project Details
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: [true, "Lead reference is required"],
      index: true
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "LeadProject",
      required: true,
      index: true
    },

    // 2. Project Status
    projectStatus: [
      {
        statusId: {
          type: Schema.Types.ObjectId,
          ref: "PmsProjectStatus",
          required: true,
          index: true
        }
      }
    ],

    // 3. WBS
    stages: [
      {
        stageId: {
          type: Schema.Types.ObjectId,
          ref: "PmsStage",
          required: true,
          index: true
        },

        // Stage Field Data
        fieldData: fieldDataSchema,

        // Works
        works: [
          {
            workId: {
              type: Schema.Types.ObjectId,
              ref: "PmsWork",
              required: true,
              index: true
            },

            // Work Field Data
            fieldData: fieldDataSchema,

            // Tasks
            tasks: [
              {
                taskId: {
                  type: Schema.Types.ObjectId,
                  ref: "PmsTask",
                  required: true,
                  index: true
                },

                // Task Field Data
                fieldData: fieldDataSchema
              }
            ]
          }
        ]
      }
    ],

    // 4. Meta Information
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },

    status: {
      type: String,
      trim: true,
      default: "Active",
      index: true
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
pmsTemplateSchema.index({
  leadId: 1,
  isDeleted: 1
});

pmsTemplateSchema.index({
  projectId: 1,
  isDeleted: 1
});

pmsTemplateSchema.index({
  status: 1,
  isDeleted: 1
});

pmsTemplateSchema.index({
  createdAt: -1
});

export const PmsTemplate = mongoose.model(
  "PmsTemplate",
  pmsTemplateSchema,
  "pms_templates"
);

export default PmsTemplate;
