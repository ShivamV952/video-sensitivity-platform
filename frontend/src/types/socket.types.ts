export interface VideoProgressEvent {
  videoId: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "failed";
  message?: string;
  sensitivityStatus?: "safe" | "flagged" | "pending";
  sensitivityScore?: number;
}

export interface VideoCompletedEvent {
  videoId: string;
  video: any;
}

export interface VideoErrorEvent {
  videoId: string;
  error: string;
  status: string;
}

export interface VideoUploadedEvent {
  videoId: string;
  video: any;
}
