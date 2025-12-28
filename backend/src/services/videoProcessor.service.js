import { SensitivityService } from "./sensitivity.service.js";
import Video from "../models/Video.js";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { getIO } from "../config/socket.js";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

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
   * Check if FFmpeg is installed and available
   * @returns {Promise<boolean>} True if FFmpeg is available
   */
  static async checkFFmpegAvailability() {
    try {
      await execAsync("ffmpeg -version");
      await execAsync("ffprobe -version");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get FFmpeg installation instructions based on OS
   * @returns {string} Installation instructions
   */
  static getFFmpegInstallInstructions() {
    const platform = process.platform;
    if (platform === "darwin") {
      return "FFmpeg is not installed. Please install it using: brew install ffmpeg";
    } else if (platform === "linux") {
      return "FFmpeg is not installed. Please install it using: sudo apt-get install ffmpeg (Ubuntu/Debian) or sudo yum install ffmpeg (CentOS/RHEL)";
    } else if (platform === "win32") {
      return "FFmpeg is not installed. Please download and install from: https://ffmpeg.org/download.html";
    }
    return "FFmpeg is not installed. Please install FFmpeg for your operating system.";
  }

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

      // Step 2: Extract video metadata using FFmpeg
      video.processingProgress = 30;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 30,
        status: "processing",
        message: "Extracting video metadata...",
      });

      // Check if FFmpeg is available
      const ffmpegAvailable = await VideoProcessorService.checkFFmpegAvailability();
      if (!ffmpegAvailable) {
        throw new Error(
          `FFmpeg is not installed or not found in PATH. ${VideoProcessorService.getFFmpegInstallInstructions()}`
        );
      }

      const videoInfo = await this.extractVideoMetadata(filePath);
      video.metadata = {
        width: videoInfo.width,
        height: videoInfo.height,
        bitrate: videoInfo.bitrate,
        codec: videoInfo.codec,
        frameRate: videoInfo.frameRate,
        format: videoInfo.format,
        hasAudio: videoInfo.hasAudio,
        audioCodec: videoInfo.audioCodec,
      };
      video.duration = videoInfo.duration;
      video.processingProgress = 40;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 40,
        status: "processing",
        message: "Video metadata extracted successfully",
      });

      // Step 3: Sensitivity analysis using FFmpeg
      video.processingProgress = 60;
      await video.save();
      io.to(socketRoom).emit("video:progress", {
        videoId,
        progress: 60,
        status: "processing",
        message: "Analyzing content sensitivity with FFmpeg...",
      });

      const analysisResult = await SensitivityService.analyzeVideo(filePath, {
        duration: video.duration,
        width: video.metadata.width,
        height: video.metadata.height,
        bitrate: video.metadata.bitrate,
        codec: video.metadata.codec,
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
   * Extract video metadata using FFmpeg
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  static async extractVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          // Check if error is due to FFmpeg not being found
          if (err.message.includes("Cannot find ffprobe") || err.message.includes("ffprobe")) {
            reject(new Error(
              `FFmpeg/FFprobe not found. ${VideoProcessorService.getFFmpegInstallInstructions()}`
            ));
          } else {
            reject(new Error(`Failed to extract metadata: ${err.message}`));
          }
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video"
        );
        const audioStream = metadata.streams.find(
          (s) => s.codec_type === "audio"
        );

        if (!videoStream) {
          reject(new Error("No video stream found in file"));
          return;
        }

        const duration = parseFloat(metadata.format.duration || 0);
        const bitrate = parseInt(metadata.format.bit_rate || 0) / 1000; // Convert to kbps

        // Parse frame rate
        let frameRate = 0;
        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split("/");
          if (parts.length === 2) {
            frameRate = parseFloat(parts[0]) / parseFloat(parts[1]);
          } else {
            frameRate = parseFloat(videoStream.r_frame_rate) || 0;
          }
        }

        resolve({
          duration,
          width: videoStream.width,
          height: videoStream.height,
          codec: videoStream.codec_name,
          bitrate,
          frameRate,
          format: metadata.format.format_name,
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          audioBitrate: audioStream
            ? parseInt(audioStream.bit_rate || 0) / 1000
            : 0,
        });
      });
    });
  }

  /**
   * Simulate processing delay (kept for compatibility)
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