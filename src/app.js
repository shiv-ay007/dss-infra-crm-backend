import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";
import rootRouter from "./routes/index.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust reverse proxy (Render, Heroku, Cloudflare) for HTTPS & Secure Cookies
app.set("trust proxy", 1);

// EJS Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  cors({
    // origin: (origin, callback) => {
    //   // Allow requests with no origin (like mobile apps, curl, postman)
    //   if (!origin) return callback(null, true);
    //   return callback(null, true);
    // },
    origin:[
      "http://localhost:5173",
      "https://crm.dssinfra.in",
      "http://crm.dssinfra.in",
      "https://dss-infra-crm.vercel.app"
    ],
    credentials: true
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Base Route Verification
// app.get("/health", (req, res) => {
//   res.status(200).json({ status: "OK", message: "Server is healthy" });
// });

app.get("/", (req, res) => {
  res.status(200).render("server-status", {
    status: "ONLINE",
    message: "DSS Infra CRM API is running successfully",
    version: "v1",
    environment: process.env.NODE_ENV || "production",
    time: new Date().toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "medium"
    })
  });
});

// Central API Router (/api/v1)
app.use("/api/v1", rootRouter);

// Global Error Handler Middleware
app.use(errorHandler);

export { app };
