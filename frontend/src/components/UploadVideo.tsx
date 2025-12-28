import React, { useState, useRef } from "react";
import { videoAPI } from "../api/axios";
import { useSocket } from "../context/SocketContext";
import ProgressBar from "./ProgressBar";
import { Video } from "../types/video.types";

interface UploadVideoProps {
  onUploadSuccess?: (video: Video) => void;
}

const UploadVideo: React.FC<UploadVideoProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { joinVideoRoom, onVideoProgress, onVideoCompleted, onVideoError } =
    useSocket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        setError(
          "Invalid file type. Please select a video file (MP4, MOV, AVI, WebM, etc.)"
        );
        return;
      }
      // Validate file size (500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError("File size exceeds 500MB limit");
        return;
      }
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a video file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);
      if (title) {
        formData.append("title", title);
      }

      const response = await videoAPI.upload(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (response.data.success) {
        const video: Video = response.data.data.video;
        setUploadedVideo(video);
        setIsUploading(false);
        setIsProcessing(true);
        setUploadProgress(100);

        // Join video room for real-time updates
        joinVideoRoom(video._id);

        // Listen for processing updates
        onVideoProgress((data) => {
          if (data.videoId === video._id) {
            setProcessingProgress(data.progress);
            if (data.status === "completed") {
              setIsProcessing(false);
              if (onUploadSuccess) {
                onUploadSuccess(video);
              }
            } else if (data.status === "failed") {
              setIsProcessing(false);
              setError("Video processing failed");
            }
          }
        });

        onVideoCompleted((data) => {
          if (data.videoId === video._id) {
            setIsProcessing(false);
            setUploadedVideo(data.video);
            if (onUploadSuccess) {
              onUploadSuccess(data.video);
            }
          }
        });

        onVideoError((data) => {
          if (data.videoId === video._id) {
            setIsProcessing(false);
            setError(data.error || "Processing error occurred");
          }
        });
      }
    } catch (err: any) {
      setIsUploading(false);
      setIsProcessing(false);
      setError(
        err.response?.data?.message || "Upload failed. Please try again."
      );
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle("");
    setUploadProgress(0);
    setProcessingProgress(0);
    setIsUploading(false);
    setIsProcessing(false);
    setError(null);
    setUploadedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Video</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {uploadedVideo && !isProcessing && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">
            Video uploaded successfully!
          </p>
          <p className="text-green-700 text-sm mt-1">
            Status: {uploadedVideo.sensitivityStatus} | Score:{" "}
            {uploadedVideo.sensitivityScore}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={isUploading || isProcessing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({formatFileSize(file.size)})
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={isUploading || isProcessing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {isUploading && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Uploading...</p>
            <ProgressBar progress={uploadProgress} status="uploading" />
          </div>
        )}

        {isProcessing && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Processing video...</p>
            <ProgressBar progress={processingProgress} status="processing" />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || isUploading || isProcessing}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading
              ? "Uploading..."
              : isProcessing
              ? "Processing..."
              : "Upload Video"}
          </button>
          {(uploadedVideo || error) && (
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Upload Another
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;
