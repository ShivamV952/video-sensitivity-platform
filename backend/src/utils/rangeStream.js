import fs from "fs";
import path from "path";

export const getVideoStream = (filePath, range) => {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const videoPath = path.resolve(filePath);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };
    return { head, file };
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    const file = fs.createReadStream(videoPath);
    return { head, file };
  }
};
