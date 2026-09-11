import mongoose, { Schema } from "mongoose";

const contractorSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Contractor Code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Contractor / Company Name is required"],
      trim: true,
      index: true
    },
    contractorType: {
      type: String,
      required: [true, "Contractor Type is required"],
      trim: true
    },
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
    workCategories: [
      {
        type: String,
        trim: true
      }
    ],
    supportedTasks: [
      {
        type: String,
        trim: true
      }
    ],
    toolsVehicles: [
      {
        type: String,
        trim: true
      }
    ],
    workWillDoneBy: {
      type: String,
      trim: true
    },
    commercialTerms: {
      type: String,
      trim: true
    },
    availability: {
      type: String,
      enum: ["Available", "Busy / Engaged", "On Notice"],
      default: "Available"
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

export const Contractor = mongoose.model("Contractor", contractorSchema);
