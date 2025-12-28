import Video from "../models/Video.js";
import { ApiError } from "../utils/apiError.js";
import { VideoProcessorService } from "../services/videoProcessor.service.js";
import { getIO } from "../config/socket.js";
import path from "path";

/**
 * Upload video
 */
export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "No video file uploaded");
    }

    const { title } = req.body;
    const file = req.file;

    // Create video document
    const video = await Video.create({
      title: title || file.originalname,
      filename: file.filename,
      originalFilename: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user._id,
      status: "uploading",
      processingProgress: 0,
    });

    // Emit upload complete event
    const io = getIO();
    const socketRoom = `video-${video._id}`;
    io.emit("video:uploaded", {
      videoId: video._id,
      video: video.toObject(),
    });

    // Start processing asynchronously
    VideoProcessorService.processVideo(video._id, file.path).catch((error) => {
      console.error("Background processing error:", error);
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully. Processing started.",
      data: {
        video,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all videos (with multi-tenant isolation)
 */
export const getVideos = async (req, res, next) => {
  try {
    const {
      status,
      sensitivityStatus,
      page = 1,
      limit = 10,
      sort = "-createdAt",
    } = req.query;

    // Build query - users can only see their own videos (unless admin)
    const query = {};
    if (req.user.role !== "admin") {
      query.uploadedBy = req.user._id;
    }

    // Add filters
    if (status) {
      query.status = status;
    }
    if (sensitivityStatus) {
      query.sensitivityStatus = sensitivityStatus;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const videos = await Video.find(query)
      .populate("uploadedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single video by ID
 */
export const getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate(
      "uploadedBy",
      "name email"
    );

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    res.json({
      success: true,
      data: {
        video,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update video (title, etc.)
 */
export const updateVideo = async (req, res, next) => {
  try {
    const { title } = req.body;
    const video = req.video; // From checkVideoOwnership middleware

    if (title) {
      video.title = title;
    }

    await video.save();

    res.json({
      success: true,
      message: "Video updated successfully",
      data: {
        video,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (req, res, next) => {
  try {
    const video = req.video; // From checkVideoOwnership middleware
    const fs = (await import("fs")).default;

    // Delete file from filesystem
    try {
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
    } catch (fileError) {
      console.error("Error deleting video file:", fileError);
    }

    // Delete from database
    await Video.findByIdAndDelete(video._id);

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get video processing status
 */
export const getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select(
      "status processingProgress sensitivityStatus sensitivityScore"
    );

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    res.json({
      success: true,
      data: {
        status: video.status,
        processingProgress: video.processingProgress,
        sensitivityStatus: video.sensitivityStatus,
        sensitivityScore: video.sensitivityScore,
      },
    });
  } catch (error) {
    next(error);
  }
};
