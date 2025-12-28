import authRoutes from "./routes/auth.routes.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import cors from "cors";
import { errorHandler } from "./utils/apiError.js";
import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import videoRoutes from "./routes/video.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded videos statically (for streaming)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last, with 4 parameters for Express to recognize it as error handler)
app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

export default app;
