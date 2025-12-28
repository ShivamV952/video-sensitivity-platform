import React, { useRef, useEffect } from "react";
import { Video } from "../types/video.types";
import { videoAPI } from "../api/axios";

interface VideoPlayerProps {
  video: Video;
  onClose?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      const token = localStorage.getItem("token");
      const streamUrl = videoAPI.getStreamUrl(video._id);
      const videoElement = videoRef.current;

      const loadVideo = async () => {
        try {
          const response = await fetch(streamUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            videoElement.src = url;
            videoElement.load();
          } else {
            console.error("Failed to load video:", response.statusText);
          }
        } catch (error) {
          console.error("Error loading video:", error);
        }
      };

      loadVideo();

      // Cleanup
      return () => {
        if (videoElement.src && videoElement.src.startsWith("blob:")) {
          URL.revokeObjectURL(videoElement.src);
        }
      };
    }
  }, [video._id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{video.title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            controls
            className="w-full h-auto"
            style={{ maxHeight: "80vh" }}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="mt-4 text-white">
          <p className="text-sm">
            <span className="font-semibold">Status:</span>{" "}
            {video.sensitivityStatus} |
            <span className="font-semibold ml-2">Score:</span>{" "}
            {video.sensitivityScore}%
          </p>
          {video.sensitivityDetails && (
            <p className="text-sm mt-2 text-gray-300">
              {video.sensitivityDetails}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
