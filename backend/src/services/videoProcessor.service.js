import Video from "../models/Video.js";
import { io } from "../config/socket.js";

export const processVideo = async (videoId) => {
  for (let i = 10; i <= 100; i += 10) {
    await new Promise((r) => setTimeout(r, 500));
    await Video.findByIdAndUpdate(videoId, { progress: i });
    io.emit("progress", { videoId, progress: i });
  }

  await Video.findByIdAndUpdate(videoId, { status: "safe" });
};
