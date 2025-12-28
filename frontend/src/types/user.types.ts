export interface User {
  id: string;
  email: string;
  name: string;
  role: "viewer" | "editor" | "admin";
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "viewer" | "editor" | "admin";
}
