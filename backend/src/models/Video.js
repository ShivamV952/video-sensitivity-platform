import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  filename: String,
  status: {
    type: String,
    enum: ["uploaded", "processing", "safe", "flagged"],
    default: "uploaded",
  },
  progress: Number,
});

export default mongoose.model("Video", videoSchema);
