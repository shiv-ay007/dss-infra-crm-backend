import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";
import rootRouter from "./routes/index.js";

const app = express();

// Trust reverse proxy (Render, Heroku, Cloudflare) for HTTPS & Secure Cookies
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Base Route Verification
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

// Central API Router (/api/v1)
app.use("/api/v1", rootRouter);

// Global Error Handler Middleware
app.use(errorHandler);

export { app };
