import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  getProfile: () => api.get("/auth/profile"),
};

// Video API
export const videoAPI = {
  upload: (formData: FormData, onUploadProgress?: (progress: number) => void) =>
    api.post("/videos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(progress);
        }
      },
    }),

  getAll: (filters?: {
    status?: string;
    sensitivityStatus?: string;
    page?: number;
    limit?: number;
  }) => api.get("/videos", { params: filters }),

  getById: (id: string) => api.get(`/videos/${id}`),

  getStatus: (id: string) => api.get(`/videos/${id}/status`),

  update: (id: string, data: { title?: string }) =>
    api.put(`/videos/${id}`, data),

  delete: (id: string) => api.delete(`/videos/${id}`),

  getStreamUrl: (id: string) => `${API_BASE_URL}/videos/${id}/stream`,
};

export default api;
