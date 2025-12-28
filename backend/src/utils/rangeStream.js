import fs from "fs";

export const streamVideo = (req, res, path) => {
  const stat = fs.statSync(path);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, { "Content-Length": stat.size });
    fs.createReadStream(path).pipe(res);
    return;
  }

  const [start, end] = range.replace(/bytes=/, "").split("-");
  const s = parseInt(start);
  const e = end ? parseInt(end) : stat.size - 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${s}-${e}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": e - s + 1,
  });

  fs.createReadStream(path, { start: s, end: e }).pipe(res);
};
