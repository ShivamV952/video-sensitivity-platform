export interface Video {
  _id: string;
  title: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  uploadedBy:
    | {
        _id: string;
        name: string;
        email: string;
      }
    | string;
  status: "uploading" | "processing" | "completed" | "failed";
  processingProgress: number;
  sensitivityStatus: "safe" | "flagged" | "pending";
  sensitivityScore: number;
  sensitivityDetails: string;
  metadata?: {
    width?: number;
    height?: number;
    bitrate?: number;
    codec?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VideoUploadResponse {
  success: boolean;
  message: string;
  data: {
    video: Video;
  };
}

export interface VideoListResponse {
  success: boolean;
  data: {
    videos: Video[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface VideoFilters {
  status?: Video["status"];
  sensitivityStatus?: Video["sensitivityStatus"];
  page?: number;
  limit?: number;
}
