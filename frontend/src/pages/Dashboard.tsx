import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import UploadVideo from "../components/UploadVideo";
import { Video } from "../types/video.types";
import { videoAPI } from "../api/axios";
import VideoCard from "../components/VideoCard";
import VideoPlayer from "../components/VideoPlayer";
import { useSocket } from "../context/SocketContext";

const Dashboard: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const { onVideoProgress, onVideoCompleted } = useSocket();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchRecentVideos();

    // Listen for real-time updates
    onVideoProgress((data) => {
      setRecentVideos((prev) =>
        prev.map((v) =>
          v._id === data.videoId
            ? { ...v, processingProgress: data.progress, status: data.status }
            : v
        )
      );
    });

    onVideoCompleted((data) => {
      setRecentVideos((prev) =>
        prev.map((v) => (v._id === data.videoId ? { ...v, ...data.video } : v))
      );
    });
  }, [user, navigate, onVideoProgress, onVideoCompleted]);

  const fetchRecentVideos = async () => {
    try {
      const response = await videoAPI.getAll({ limit: 5 });
      if (response.data.success) {
        setRecentVideos(response.data.data.videos);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (video: Video) => {
    setRecentVideos((prev) => [video, ...prev].slice(0, 5));
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await videoAPI.delete(videoId);
        setRecentVideos((prev) => prev.filter((v) => v._id !== videoId));
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.name}!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {user.role}
              </span>
              <button
                onClick={() => navigate("/library")}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Video Library
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
        {/* Upload Section */}
        {hasRole("editor") && (
          <div className="mb-8">
            <UploadVideo onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Recent Videos */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Videos
          </h2>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading videos...</p>
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <p className="text-gray-600">
                No videos yet. Upload your first video!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentVideos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onPlay={setSelectedVideo}
                  onDelete={hasRole("editor") ? handleDeleteVideo : undefined}
                />
              ))}
            </div>
          )}
        </div>
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

export default Dashboard;
