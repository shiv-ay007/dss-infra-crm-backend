import express from "express";
import {
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 1. User login (POST /api/v1/auth/login)
router.post("/login", loginUser);

// 2. User logout (POST /api/v1/auth/logout)
router.post("/logout", verifyJWT, logoutUser);

// 3. Get current authenticated user (GET /api/v1/auth/me)
router.get("/me", verifyJWT, getCurrentUser);

// 4. Refresh token (POST /api/v1/auth/refresh-token)
router.post("/refresh-token", refreshAccessToken);

export default router;
