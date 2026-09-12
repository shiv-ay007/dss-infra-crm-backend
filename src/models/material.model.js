import mongoose, { Schema } from "mongoose";

const materialSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Material Code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Material Name is required"],
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, "Material Category is required"],
      trim: true,
      index: true
    },
    subCategory: {
      type: String,
      trim: true
    },
    materialType: {
      type: String,
      enum: ["Construction Material", "Consumable", "Service", "Other"],
      default: "Construction Material",
      required: true
    },
    materialDetails: {
      type: String,
      trim: true
    },
    specificationGrade: {
      type: String,
      trim: true
    },
    baseUom: {
      type: String,
      required: [true, "Base UOM is required"],
      trim: true
    },
    purchaseUom: {
      type: String,
      trim: true
    },
    conversionFactor: {
      type: Number,
      default: null
    },
    brand: {
      type: String,
      trim: true,
      default: "Generic"
    },
    standardSpecCode: {
      type: String,
      trim: true
    },
    preferredSupplier: {
      type: String,
      trim: true
    },
    preferredSupplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },
    supplierType: {
      type: String,
      trim: true
    },
    standardPurchaseRate: {
      type: Number,
      default: 0
    },
    leadTimeDays: {
      type: Number,
      default: 0
    },
    moq: {
      type: Number,
      default: 0
    },
    storageRequirement: {
      type: String,
      trim: true
    },
    documents: [
      {
        name: { type: String },
        size: { type: String },
        type: { type: String },
        url: { type: String },
        public_id: { type: String }
      }
    ],
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
      index: true
    },
    remarks: {
      type: String,
      trim: true
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

export const Material = mongoose.model("Material", materialSchema);
