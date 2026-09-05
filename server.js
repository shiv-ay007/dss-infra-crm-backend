import "dotenv/config";
import https from "https";
import http from "http";
import connectDB from "./src/config/db.js";
import { app } from "./src/app.js";

const PORT = process.env.PORT || 8000;

// Keep-Alive Ping to prevent Render Free Tier from sleeping
const startKeepAlivePing = () => {
  const SERVER_URL = process.env.SERVER_URL || "https://dss-infra-crm.onrender.com/health";
  const intervalMs = 14 * 60 * 1000; // Ping every 14 minutes

  setInterval(() => {
    try {
      const client = SERVER_URL.startsWith("https") ? https : http;
      client.get(SERVER_URL, (res) => {
        // server kept awake
      }).on("error", () => {
        // silent catch
      });
    } catch (e) {
      // silent catch
    }
  }, intervalMs);
};

// Connect to Database & Start Server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Server is running at port: ${PORT}`);
      console.log(` Health check URL: http://localhost:${PORT}/health`);
      startKeepAlivePing();
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed !!! ", err);
  });