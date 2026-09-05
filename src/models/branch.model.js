import mongoose, { Schema } from "mongoose";

const branchSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Branch name is required"],
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

// Indexes for search and filter optimization
branchSchema.index({ name: 1, isDeleted: 1 });
branchSchema.index({ city: 1, isDeleted: 1 });
branchSchema.index({ state: 1, isDeleted: 1 }); // ✅ State index
branchSchema.index({ pincode: 1, isDeleted: 1 }); // ✅ Pincode index
branchSchema.index({ isActive: 1, isDeleted: 1 }); // ✅ Active + Deleted combined index

// Compound index for active branches search
branchSchema.index({ name: 1, isActive: 1, isDeleted: 1 });
branchSchema.index({ city: 1, isActive: 1, isDeleted: 1 });
branchSchema.index({ state: 1, isActive: 1, isDeleted: 1 });

// Full-text search index (Name, City, State, Pincode)
branchSchema.index({ name: "text", city: "text", state: "text", pincode: "text" });

export const Branch = mongoose.model("Branch", branchSchema);