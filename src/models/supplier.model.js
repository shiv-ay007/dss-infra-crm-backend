import mongoose, { Schema } from "mongoose";

const supplierSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Supplier Code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Supplier Name is required"],
      trim: true,
      index: true
    },
    supplierType: {
      type: String,
      required: [true, "Supplier Type is required"],
      trim: true
    },
    supplierCategories: [
      {
        type: String,
        trim: true
      }
    ],
    contactPerson: {
      type: String,
      required: [true, "Primary Contact Person is required"],
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Primary Phone number is required"],
      trim: true
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    whatsappNo: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
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
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      index: true
    },
    pincode: {
      type: String,
      trim: true
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true
    },
    msmeNo: {
      type: String,
      trim: true
    },
    materialsSupplied: {
      type: [String],
      required: [true, "At least one material must be selected"]
    },
    paymentTerms: {
      type: String,
      trim: true
    },
    creditLimit: {
      type: Number,
      default: 0
    },
    deliveryLeadTime: {
      type: Number,
      default: 0
    },
    bankName: {
      type: String,
      trim: true
    },
    accountHolderName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifsc: {
      type: String,
      trim: true,
      uppercase: true
    },
    documents: [
      {
        name: { type: String },
        size: { type: String },
        type: { type: String },
        url: { type: String }
      }
    ],
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blocked"],
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

export const Supplier = mongoose.model("Supplier", supplierSchema);
