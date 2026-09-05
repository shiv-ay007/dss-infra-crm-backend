import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Cookie configuration options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax"
};

/**
 * Helper to generate access & refresh tokens
 */
const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const accessToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || "Admin"
    },
    process.env.ACCESS_TOKEN_SECRET || "8fK3xQ9mV2pL7zR4nT6wY1aB5cD9eH2j",
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
  );

  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_SECRET || "lead_mgmt_refresh_token_secret_key_2026_abc",
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" }
  );

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// ============================================
// 1. LOGIN USER
// ============================================
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(new ApiResponse(400, null, "Email and password are required"));
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false
  }).populate([
    { path: "departments", select: "name city" },
    { path: "branch", select: "name city" }
  ]);

  if (!user) {
    return res.status(401).json(new ApiResponse(401, null, "Invalid credentials. User not found."));
  }

  if (!user.isActive) {
    return res.status(403).json(new ApiResponse(403, null, "Your account is deactivated. Please contact admin."));
  }

  // Password verification: supports both bcrypt hashes and legacy plain-text entries
  let isPasswordValid = false;
  if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
    isPasswordValid = await bcrypt.compare(password, user.password);
  } else {
    isPasswordValid = (user.password === password);
    if (isPasswordValid) {
      // Upgrade plain text password to bcrypt hash for future security
      user.password = await bcrypt.hash(password, 10);
    }
  }

  if (!isPasswordValid) {
    return res.status(401).json(new ApiResponse(401, null, "Invalid credentials or password mismatch."));
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = user.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;
  if (!loggedInUser.role) {
    loggedInUser.role = "Admin";
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "Sales Login Successful! Welcome " + (loggedInUser.name || "")
      )
    );
});

// ============================================
// 2. LOGOUT USER
// ============================================
export const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );
  }

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ============================================
// 3. GET CURRENT LOGGED IN USER
// ============================================
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// ============================================
// 4. REFRESH ACCESS TOKEN
// ============================================
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized: No refresh token provided");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || "lead_mgmt_refresh_token_secret_key_2026_abc"
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or already used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
