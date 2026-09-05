import mongoose, { Mongoose, Schema } from "mongoose";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// Address sub-schema (Object ke roop me)
const addressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  { _id: false } // address ke liye alag se _id generate na ho
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      index: true // ✅ Phone search ke liye
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    role: {
      type: String,
      default: "Admin",
      enum: ["Admin", "Executive", "Manager", "Sales", "Employee"],
      trim: true
    },

    // 🏢 Department Reference (Single ya multiple departments ke liye)
    departments:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        index : true
      },

    // 📍 Branch Reference
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true // ✅ Branch-based filtering ke liye
    },

    // 🏠 Address Object
    address: addressSchema,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true // ✅ Active users filter ke liye
    },
    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for search optimization
userSchema.index({ name: 1, isDeleted: 1 });
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });
userSchema.index({ branch: 1, isDeleted: 1 });
userSchema.index({ name: "text", email: "text", phone: "text" });

export const User = mongoose.model("User", userSchema);