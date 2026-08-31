import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { formatISTDate } from "../utils/dateHelper.js";

export const UserRolesEnum = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SALES_EXECUTIVE: "SALES_EXECUTIVE"
};

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    role: {
      type: String,
      enum: Object.values(UserRolesEnum),
      default: UserRolesEnum.SALES_EXECUTIVE
    },
    isActive: {
      type: Boolean,
      default: true
    },
    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.virtual("createdAtIST").get(function () {
  return formatISTDate(this.createdAt);
});

userSchema.virtual("updatedAtIST").get(function () {
  return formatISTDate(this.updatedAt);
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    const isMatch = await bcrypt.compare(password, this.password);
    if (isMatch) return true;
  } catch (e) {
    // fallback check
  }
  return this.password === password;
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d"
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d"
    }
  );
};

export const User = mongoose.model("User", userSchema);
