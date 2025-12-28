import http from "http";
import app from "./app.js";
import { initSocket, getIO } from "./config/socket.js";
import { config } from "./config/env.js";

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Handle socket connections for video processing updates
io.on("connection", (socket) => {
  // Join room for specific video updates
  socket.on("video:join", (videoId) => {
    socket.join(`video-${videoId}`);
    console.log(`Client ${socket.id} joined room: video-${videoId}`);
  });

  socket.on("video:leave", (videoId) => {
    socket.leave(`video-${videoId}`);
    console.log(`Client ${socket.id} left room: video-${videoId}`);
  });
});

server.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
