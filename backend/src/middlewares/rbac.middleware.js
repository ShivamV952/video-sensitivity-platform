import { ApiError } from "../utils/apiError.js";

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Required role: ${roles.join(" or ")}`)
      );
    }

    next();
  };
};

// Middleware to ensure user can only access their own videos (multi-tenant)
export const checkVideoOwnership = async (req, res, next) => {
  try {
    const videoId = req.params.id || req.params.videoId;
    const Video = (await import("../models/Video.js")).default;

    const video = await Video.findById(videoId);

    if (!video) {
      return next(new ApiError(404, "Video not found"));
    }

    // Admin can access all videos
    if (req.user.role === "admin") {
      req.video = video;
      return next();
    }

    // Users can only access their own videos
    if (video.uploadedBy.toString() !== req.user._id.toString()) {
      return next(
        new ApiError(403, "Access denied. You can only access your own videos.")
      );
    }

    req.video = video;
    next();
  } catch (error) {
    next(error);
  }
};
