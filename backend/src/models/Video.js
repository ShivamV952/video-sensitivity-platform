import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "uploading",
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sensitivityStatus: {
      type: String,
      enum: ["safe", "flagged", "pending"],
      default: "pending",
    },
    sensitivityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sensitivityDetails: {
      type: String,
      default: "",
    },
    metadata: {
      width: Number,
      height: Number,
      bitrate: Number,
      codec: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ sensitivityStatus: 1 });
videoSchema.index({ status: 1 });

export default mongoose.model("Video", videoSchema);
