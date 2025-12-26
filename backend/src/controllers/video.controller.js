import Video from "../models/Video.js";
import { processVideo } from "../services/videoProcessor.service.js";

export const uploadVideo = async (req, res) => {
  const video = await Video.create({
    userId: req.user.id,
    filename: req.file.filename,
    status: "processing",
    progress: 0,
  });

  processVideo(video._id);

  res.json({ message: "Upload started", videoId: video._id });
};
