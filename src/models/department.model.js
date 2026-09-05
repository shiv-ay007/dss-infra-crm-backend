import mongoose, { Schema } from "mongoose";

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      index: true
    },
    city: {
      type: String,
      trim: true,
      index: true
    },
    state: {
      type: String,
      trim: true,
      index: true // ✅ State filter ke liye
    },
    pincode: {
      type: String,
      trim: true,
      index: true // ✅ Pincode filter ke liye
    },
    address: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true // ✅ Active/Inactive filter ke liye
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

// Indexes for search optimization
departmentSchema.index({ name: 1, isDeleted: 1 });
departmentSchema.index({ city: 1, isDeleted: 1 });
departmentSchema.index({ state: 1, isDeleted: 1 });
departmentSchema.index({ pincode: 1, isDeleted: 1 });
departmentSchema.index({ isActive: 1, isDeleted: 1 });
departmentSchema.index({ name: "text", city: "text", state: "text", pincode: "text" });

export const Department = mongoose.model("Department", departmentSchema);