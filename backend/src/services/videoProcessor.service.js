import fs from "fs";
import path from "path";
import Video from "../models/Video.js";
import { SensitivityService } from "./sensitivity.service.js";
import { getIO } from "../config/socket.js";

/**
 * Video Processing Service
 *
 * Handles video processing pipeline:
 * 1. Upload validation
 * 2. Storage management
 * 3. Sensitivity analysis
 * 4. Real-time progress updates
 * 5. Streaming preparation
 */
export class VideoProcessorService {
  /**
   * Process video asynchronously
   * @param {string} videoId - Video document ID
   * @param {string} filePath - Path to uploaded video file
   */
  static async processVideo(videoId, filePath) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error("Video not found");
      }

      const io = getIO();
      const socketRoom = `video-${videoId}`;

      // Step 1: Update status to processing
      video.status = "processing";
      video.processingProgress = 10;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 10,
        status: "processing",
        message: "Starting video processing...",
      });

      // Step 2: Extract video metadata (simulated)
      // In production, use ffmpeg or similar to extract actual metadata
      await this.simulateDelay(500);
      video.processingProgress = 30;
      video.metadata = {
        width: 1920,
        height: 1080,
        bitrate: 5000,
        codec: "h264",
      };
      video.duration = 120; // Simulated duration in seconds
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 30,
        status: "processing",
        message: "Extracting video metadata...",
      });

      // Step 3: Sensitivity analysis
      await this.simulateDelay(1000);
      video.processingProgress = 60;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 60,
        status: "processing",
        message: "Analyzing content sensitivity...",
      });

      const analysisResult = await SensitivityService.analyzeVideo(filePath, {
        duration: video.duration,
      });

      // Step 4: Update video with analysis results
      video.sensitivityStatus = analysisResult.sensitivityStatus;
      video.sensitivityScore = analysisResult.sensitivityScore;
      video.sensitivityDetails = analysisResult.sensitivityDetails;
      video.processingProgress = 90;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 90,
        status: "processing",
        message: "Finalizing processing...",
      });

      // Step 5: Complete processing
      await this.simulateDelay(500);
      video.status = "completed";
      video.processingProgress = 100;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 100,
        status: "completed",
        message: "Video processing completed",
        sensitivityStatus: video.sensitivityStatus,
        sensitivityScore: video.sensitivityScore,
      });

      // Final completion event
      io.to(socketRoom).emit("video:completed", {
        videoId,
        video: video.toObject(),
      });
    } catch (error) {
      console.error("Error processing video:", error);

      const video = await Video.findById(videoId);
      if (video) {
        video.status = "failed";
        await video.save();

        const io = getIO();
        const socketRoom = `video-${videoId}`;
        io.to(socketRoom).emit("video:error", {
          videoId,
          error: error.message,
          status: "failed",
        });
      }
    }
  }

  /**
   * Simulate processing delay
   * @param {number} ms - Milliseconds to delay
   */
  static async simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get video file stats
   * @param {string} filePath - Path to video file
   * @returns {Object} File statistics
   */
  static getVideoStats(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get video stats: ${error.message}`);
    }
  }
}
