import { getVideoStream } from "../utils/rangeStream.js";
import Video from "../models/Video.js";
import { ApiError } from "../utils/apiError.js";
import fs from "fs";

/**
 * Stream video with range request support
 */
export const streamVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Multi-tenant check: users can only stream their own videos (unless admin)
    if (
      req.user.role !== "admin" &&
      video.uploadedBy.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(
        403,
        "Access denied. You can only stream your own videos."
      );
    }

    // Check if video is completed
    if (video.status !== "completed") {
      throw new ApiError(
        400,
        "Video is still processing. Please wait for processing to complete."
      );
    }

    // Check file exists
    if (!fs.existsSync(video.filePath)) {
      throw new ApiError(404, "Video file not found on server");
    }

    const range = req.headers.range;
    const { head, file } = getVideoStream(video.filePath, range);

    res.writeHead(range ? 206 : 200, head);
    file.pipe(res);
  } catch (error) {
    next(error);
  }
};
