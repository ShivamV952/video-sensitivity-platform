import React from "react";
import { Video } from "../types/video.types";
import ProgressBar from "./ProgressBar";

interface VideoCardProps {
  video: Video;
  onPlay?: (video: Video) => void;
  onDelete?: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay, onDelete }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      processing: "bg-blue-100 text-blue-800",
      uploading: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          statusColors[video.status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {video.status}
      </span>
    );
  };

  const getSensitivityBadge = () => {
    const sensitivityColors: Record<string, string> = {
      safe: "bg-green-100 text-green-800",
      flagged: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          sensitivityColors[video.sensitivityStatus] ||
          "bg-gray-100 text-gray-800"
        }`}
      >
        {video.sensitivityStatus}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
            {video.title}
          </h3>
          {onDelete && video.status === "completed" && (
            <button
              onClick={() => onDelete(video._id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Delete
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {getStatusBadge()}
          {getSensitivityBadge()}
        </div>

        {video.status === "processing" && (
          <div className="mb-3">
            <ProgressBar
              progress={video.processingProgress}
              status={video.status}
            />
          </div>
        )}

        <div className="space-y-1 text-sm text-gray-600 mb-4">
          <p>
            <span className="font-medium">Size:</span>{" "}
            {formatFileSize(video.fileSize)}
          </p>
          {video.duration > 0 && (
            <p>
              <span className="font-medium">Duration:</span>{" "}
              {Math.floor(video.duration / 60)}:
              {(video.duration % 60).toString().padStart(2, "0")}
            </p>
          )}
          <p>
            <span className="font-medium">Uploaded:</span>{" "}
            {formatDate(video.createdAt)}
          </p>
          {video.sensitivityScore > 0 && (
            <p>
              <span className="font-medium">Sensitivity Score:</span>{" "}
              {video.sensitivityScore.toFixed(1)}%
            </p>
          )}
        </div>

        {video.status === "completed" && onPlay && (
          <button
            onClick={() => onPlay(video)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Play Video
          </button>
        )}

        {video.status === "failed" && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            Processing failed. Please try uploading again.
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
