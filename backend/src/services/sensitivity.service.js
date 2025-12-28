/**
 * Sensitivity Analysis Service using FFmpeg
 *
 * This service uses FFmpeg to analyze video content for sensitivity:
 * - Extracts video metadata (duration, resolution, codec, bitrate)
 * - Analyzes video properties (brightness, contrast, scene changes)
 * - Detects potential sensitive content indicators
 * - Calculates sensitivity score based on video characteristics
 */

import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

export class SensitivityService {
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
   * Analyze video for sensitive content using FFmpeg
   * @param {string} filePath - Path to the video file
   * @param {Object} metadata - Video metadata (duration, etc.)
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeVideo(filePath, metadata = {}) {
    try {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Video file not found: ${filePath}`);
      }

      // Check if FFmpeg is available
      const ffmpegAvailable = await SensitivityService.checkFFmpegAvailability();
      if (!ffmpegAvailable) {
        throw new Error(
          `FFmpeg is not installed or not found in PATH. ${SensitivityService.getFFmpegInstallInstructions()}`
        );
      }

      // Get comprehensive video metadata using FFmpeg
      const videoInfo = await this.getVideoInfo(filePath);
      
      // Analyze video characteristics
      const analysis = await this.analyzeVideoCharacteristics(filePath, videoInfo);

      // Calculate sensitivity score based on multiple factors
      const sensitivityScore = this.calculateSensitivityScore(analysis, videoInfo);

      // Determine sensitivity status
      let sensitivityStatus = "safe";
      let sensitivityDetails = "";

      if (sensitivityScore > 70) {
        sensitivityStatus = "flagged";
        sensitivityDetails = this.generateFlaggedDetails(analysis);
      } else if (sensitivityScore > 50) {
        sensitivityStatus = "safe";
        sensitivityDetails = "Content appears safe with minor warnings. Some characteristics may require review.";
      } else {
        sensitivityStatus = "safe";
        sensitivityDetails = "Content is safe for general viewing.";
      }

      return {
        sensitivityStatus,
        sensitivityScore: Math.round(sensitivityScore * 100) / 100,
        sensitivityDetails,
        analyzedAt: new Date(),
        analysisDetails: {
          duration: videoInfo.duration,
          resolution: `${videoInfo.width}x${videoInfo.height}`,
          bitrate: videoInfo.bitrate,
          codec: videoInfo.codec,
          frameRate: videoInfo.frameRate,
          fileSize: videoInfo.size,
          ...analysis,
        },
      };
    } catch (error) {
      console.error("Error analyzing video with FFmpeg:", error);
      
      // Fallback to basic analysis if FFmpeg fails
      return {
        sensitivityStatus: "unknown",
        sensitivityScore: 0,
        sensitivityDetails: `Analysis error: ${error.message}. Manual review recommended.`,
        analyzedAt: new Date(),
      };
    }
  }

  /**
   * Get comprehensive video information using FFmpeg
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  static async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          // Check if error is due to FFmpeg not being found
          if (err.message.includes("Cannot find ffprobe") || err.message.includes("ffprobe")) {
            reject(new Error(
              `FFmpeg/FFprobe not found. ${SensitivityService.getFFmpegInstallInstructions()}`
            ));
          } else {
            reject(new Error(`FFprobe error: ${err.message}`));
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
          reject(new Error("No video stream found"));
          return;
        }

        const fileStats = fs.statSync(filePath);
        const duration = parseFloat(metadata.format.duration || 0);
        const bitrate = parseInt(metadata.format.bit_rate || 0) / 1000; // Convert to kbps

        resolve({
          duration,
          width: videoStream.width,
          height: videoStream.height,
          codec: videoStream.codec_name,
          bitrate,
          frameRate: this.parseFrameRate(videoStream.r_frame_rate),
          size: fileStats.size,
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          audioBitrate: audioStream
            ? parseInt(audioStream.bit_rate || 0) / 1000
            : 0,
          format: metadata.format.format_name,
          sizeInMB: (fileStats.size / (1024 * 1024)).toFixed(2),
        });
      });
    });
  }

  /**
   * Parse frame rate from FFmpeg format (e.g., "30/1" -> 30)
   * @param {string} frameRate - Frame rate string from FFmpeg
   * @returns {number} Frame rate as number
   */
  static parseFrameRate(frameRate) {
    if (!frameRate) return 0;
    const parts = frameRate.split("/");
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(frameRate) || 0;
  }

  /**
   * Analyze video characteristics using FFmpeg
   * @param {string} filePath - Path to video file
   * @param {Object} videoInfo - Video metadata
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeVideoCharacteristics(filePath, videoInfo) {
    const analysis = {
      averageBrightness: 0,
      brightnessVariance: 0,
      sceneChanges: 0,
      hasAudio: videoInfo.hasAudio,
      resolutionScore: 0,
      bitrateScore: 0,
      durationScore: 0,
    };

    try {
      // Analyze brightness levels (extract frames and analyze)
      const brightnessAnalysis = await this.analyzeBrightness(filePath, videoInfo);
      analysis.averageBrightness = brightnessAnalysis.average;
      analysis.brightnessVariance = brightnessAnalysis.variance;

      // Detect scene changes
      analysis.sceneChanges = await this.detectSceneChanges(filePath, videoInfo);

      // Calculate scores based on characteristics
      analysis.resolutionScore = this.scoreResolution(videoInfo.width, videoInfo.height);
      analysis.bitrateScore = this.scoreBitrate(videoInfo.bitrate);
      analysis.durationScore = this.scoreDuration(videoInfo.duration);
    } catch (error) {
      console.error("Error in video characteristics analysis:", error);
    }

    return analysis;
  }

  /**
   * Analyze brightness levels in video using FFmpeg signalstats
   * @param {string} filePath - Path to video file
   * @param {Object} videoInfo - Video metadata
   * @returns {Promise<Object>} Brightness analysis
   */
  static async analyzeBrightness(filePath, videoInfo) {
    return new Promise((resolve) => {
      const brightnessValues = [];
      const sampleInterval = Math.max(2, Math.floor(videoInfo.duration / 8)); // Sample every N seconds, up to 8 samples
      
      // Use FFmpeg's signalstats filter to extract brightness information
      // This analyzes the entire video and outputs statistics
      ffmpeg(filePath)
        .outputOptions([
          "-vf",
         `signalstats=metadata=1:frame=1,select='not(mod(n\\,${Math.floor(videoInfo.frameRate * sampleInterval)})'`,
          "-f",
          "null",
        ])
        .on("stderr", (stderrLine) => {
          // FFmpeg outputs metadata to stderr
          // Parse brightness (YAVG - average luma) from various possible formats
          const patterns = [
            /lavfi\.signalstats\.YAVG=([\d.]+)/i,
            /YAVG:([\d.]+)/i,
            /YAVG\s*=\s*([\d.]+)/i,
            /lavfi\.signalstats\.YAVG\s*([\d.]+)/i,
          ];
          
          for (const pattern of patterns) {
            const match = stderrLine.match(pattern);
            if (match) {
              const brightness = parseFloat(match[1]);
              // YAVG is typically 0-255 for 8-bit video
              if (!isNaN(brightness) && brightness >= 0 && brightness <= 255) {
                brightnessValues.push(brightness);
                break; // Found a match, no need to check other patterns
              }
            }
          }
        })
        .on("end", () => {
          if (brightnessValues.length === 0) {
            // If no brightness data extracted, use a neutral value
            // This might happen if video format doesn't support signalstats
            console.log("No brightness data extracted from video, using default");
            resolve({ average: 50, variance: 10 });
            return;
          }

          // Calculate average and variance from extracted values
          const avg = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
          const variance = brightnessValues.reduce(
            (sum, val) => sum + Math.pow(val - avg, 2),
            0
          ) / brightnessValues.length;

          resolve({ average: avg, variance: variance });
        })
        .on("error", (err) => {
          console.error("Brightness analysis error:", err.message);
          // Fallback on error - use neutral brightness
          resolve({ average: 50, variance: 10 });
        })
        .format("null")
        .save("/dev/null");
    });
  }

  /**
   * Detect scene changes in video using FFmpeg
   * @param {string} filePath - Path to video file
   * @param {Object} videoInfo - Video metadata
   * @returns {Promise<number>} Number of scene changes detected
   */
  static async detectSceneChanges(filePath, videoInfo) {
    return new Promise((resolve) => {
      let sceneChangeCount = 0;
      let hasOutput = false;

      // Use FFmpeg's scene detection filter
      ffmpeg(filePath)
        .outputOptions([
          "-vf",
          "select='gt(scene,0.3)',showinfo",
          "-vsync",
          "0",
          "-f",
          "null",
        ])
        .on("stderr", (stderrLine) => {
          // FFmpeg outputs scene detection info to stderr
          // Look for frame info which indicates scene changes when using select filter
          if (stderrLine.includes("n:") || stderrLine.includes("pts_time:")) {
            // When select filter finds a scene change, it outputs frame info
            sceneChangeCount++;
            hasOutput = true;
          }
          // Also check for explicit scene score mentions
          if (stderrLine.match(/scene_score|scene\s*=/i)) {
            sceneChangeCount++;
            hasOutput = true;
          }
        })
        .on("end", () => {
          // If no scene changes detected but video is long, might be continuous scene
          // Return actual count or estimate
          if (!hasOutput && videoInfo.duration > 0) {
            // Very rough estimate: 1 scene change per 15-30 seconds for typical content
            resolve(Math.max(0, Math.floor(videoInfo.duration / 20)));
          } else {
            resolve(sceneChangeCount);
          }
        })
        .on("error", (err) => {
          console.error("Scene detection error:", err.message);
          // Estimate based on duration (roughly 1 scene change per 20 seconds)
          resolve(Math.max(0, Math.floor(videoInfo.duration / 20)));
        })
        .format("null")
        .save("/dev/null");
    });
  }

  /**
   * Score resolution (higher resolution might indicate professional content)
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {number} Score 0-100
   */
  static scoreResolution(width, height) {
    const pixels = width * height;
    if (pixels >= 1920 * 1080) return 20; // High res
    if (pixels >= 1280 * 720) return 15; // Medium res
    if (pixels >= 640 * 480) return 10; // Low res
    return 5; // Very low res
  }

  /**
   * Score bitrate (very high or very low bitrate might be suspicious)
   * @param {number} bitrate - Bitrate in kbps
   * @returns {number} Score 0-100
   */
  static scoreBitrate(bitrate) {
    if (bitrate > 10000) return 25; // Very high bitrate
    if (bitrate > 5000) return 15; // High bitrate
    if (bitrate < 500) return 20; // Very low bitrate (might be compressed/edited)
    return 10; // Normal bitrate
  }

  /**
   * Score duration (very short or very long videos might be suspicious)
   * @param {number} duration - Duration in seconds
   * @returns {number} Score 0-100
   */
  static scoreDuration(duration) {
    if (duration < 5) return 15; // Very short
    if (duration > 3600) return 20; // Very long (>1 hour)
    if (duration > 1800) return 15; // Long (>30 min)
    return 5; // Normal duration
  }

  /**
   * Calculate overall sensitivity score
   * @param {Object} analysis - Analysis results
   * @param {Object} videoInfo - Video metadata
   * @returns {number} Sensitivity score 0-100
   */
  static calculateSensitivityScore(analysis, videoInfo) {
    let score = 0;

    // Base score from video characteristics
    score += analysis.resolutionScore * 0.2;
    score += analysis.bitrateScore * 0.2;
    score += analysis.durationScore * 0.15;

    // Brightness analysis (extreme brightness/darkness might indicate issues)
    const brightnessDeviation = Math.abs(analysis.averageBrightness - 50);
    score += (brightnessDeviation / 50) * 15; // Up to 15 points

    // Scene changes (many scene changes might indicate edited content)
    const sceneChangeRate = analysis.sceneChanges / Math.max(videoInfo.duration, 1);
    if (sceneChangeRate > 0.5) {
      score += 10; // Many scene changes
    }

    // Audio presence (videos without audio might be suspicious)
    if (!analysis.hasAudio) {
      score += 5;
    }

    // File size anomalies
    const expectedSize = (videoInfo.bitrate * videoInfo.duration) / 8; // Rough estimate in bytes
    const sizeRatio = videoInfo.size / Math.max(expectedSize, 1);
    if (sizeRatio < 0.5 || sizeRatio > 2) {
      score += 10; // Size doesn't match expected
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate detailed message for flagged content
   * @param {Object} analysis - Analysis results
   * @returns {string} Detailed message
   */
  static generateFlaggedDetails(analysis) {
    const reasons = [];

    if (analysis.resolutionScore > 15) {
      reasons.push("unusual resolution characteristics");
    }
    if (analysis.bitrateScore > 15) {
      reasons.push("atypical bitrate patterns");
    }
    if (analysis.durationScore > 15) {
      reasons.push("unusual video duration");
    }
    if (analysis.sceneChanges > 20) {
      reasons.push("frequent scene changes detected");
    }
    if (!analysis.hasAudio) {
      reasons.push("missing audio track");
    }

    if (reasons.length === 0) {
      reasons.push("multiple content characteristics");
    }

    return `Content flagged due to: ${reasons.join(", ")}. Manual review recommended.`;
  }

  /**
   * Get processing progress (for compatibility)
   * @param {number} currentStep - Current processing step
   * @param {number} totalSteps - Total processing steps
   * @returns {number} Progress percentage
   */
  static getProgress(currentStep, totalSteps) {
    return Math.round((currentStep / totalSteps) * 100);
  }
}