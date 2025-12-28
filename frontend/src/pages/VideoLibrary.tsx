import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Video, VideoFilters } from "../types/video.types";
import { videoAPI } from "../api/axios";
import VideoCard from "../components/VideoCard";
import VideoPlayer from "../components/VideoPlayer";
import { useSocket } from "../context/SocketContext";

const VideoLibrary: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VideoFilters>({
    page: 1,
    limit: 12,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sensitivityFilter, setSensitivityFilter] = useState<string>("all");
  const { onVideoProgress, onVideoCompleted } = useSocket();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchVideos();
  }, [user, navigate, filters, statusFilter, sensitivityFilter]);

  useEffect(() => {
    // Listen for real-time updates
    onVideoProgress((data) => {
      setVideos((prev) =>
        prev.map((v) =>
          v._id === data.videoId
            ? { ...v, processingProgress: data.progress, status: data.status }
            : v
        )
      );
    });

    onVideoCompleted((data) => {
      setVideos((prev) =>
        prev.map((v) => (v._id === data.videoId ? { ...v, ...data.video } : v))
      );
    });
  }, [onVideoProgress, onVideoCompleted]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params: VideoFilters = {
        page: filters.page,
        limit: filters.limit,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter as Video["status"];
      }

      if (sensitivityFilter !== "all") {
        params.sensitivityStatus =
          sensitivityFilter as Video["sensitivityStatus"];
      }

      const response = await videoAPI.getAll(params);
      if (response.data.success) {
        setVideos(response.data.data.videos);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    type: "status" | "sensitivity",
    value: string
  ) => {
    if (type === "status") {
      setStatusFilter(value);
      setFilters({ ...filters, page: 1 });
    } else {
      setSensitivityFilter(value);
      setFilters({ ...filters, page: 1 });
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await videoAPI.delete(videoId);
        setVideos((prev) => prev.filter((v) => v._id !== videoId));
      } catch (error) {
        console.error("Error deleting video:", error);
        alert("Failed to delete video");
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Video Library
              </h1>
              <p className="text-sm text-gray-600">
                Manage and view all your videos
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="uploading">Uploading</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensitivity
              </label>
              <select
                value={sensitivityFilter}
                onChange={(e) =>
                  handleFilterChange("sensitivity", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="safe">Safe</option>
                <option value="flagged">Flagged</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              No videos found matching your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {videos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onPlay={setSelectedVideo}
                  onDelete={hasRole("editor") ? handleDeleteVideo : undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};

export default VideoLibrary;
