import express from "express";
import {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  getVideoStatus,
} from "../controllers/video.controller.js";
import { streamVideo } from "../controllers/stream.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  checkVideoOwnership,
} from "../middlewares/rbac.middleware.js";
import { upload, handleUploadError } from "../middlewares/upload.middleware.js";

const router = express.Router();

// All video routes require authentication
router.use(authenticate);

// Upload video (editor and admin only)
router.post(
  "/upload",
  authorize("editor", "admin"),
  upload.single("video"),
  handleUploadError,
  uploadVideo
);

// Get all videos (with multi-tenant isolation)
router.get("/", getVideos);

// Get video status
router.get("/:id/status", getVideoStatus);

// Stream video (viewer, editor, admin)
router.get("/:id/stream", streamVideo);

// Get single video
router.get("/:id", getVideo);

// Update video (editor and admin only, and must own the video)
router.put(
  "/:id",
  authorize("editor", "admin"),
  checkVideoOwnership,
  updateVideo
);

// Delete video (editor and admin only, and must own the video)
router.delete(
  "/:id",
  authorize("editor", "admin"),
  checkVideoOwnership,
  deleteVideo
);

export default router;
