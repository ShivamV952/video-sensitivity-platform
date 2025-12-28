import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { VideoProgressEvent, VideoCompletedEvent, VideoErrorEvent, VideoUploadedEvent } from '../types/socket.types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinVideoRoom: (videoId: string) => void;
  leaveVideoRoom: (videoId: string) => void;
  onVideoProgress: (callback: (data: VideoProgressEvent) => void) => void;
  onVideoCompleted: (callback: (data: VideoCompletedEvent) => void) => void;
  onVideoError: (callback: (data: VideoErrorEvent) => void) => void;
  onVideoUploaded: (callback: (data: VideoUploadedEvent) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinVideoRoom = (videoId: string) => {
    if (socket) {
      socket.emit('video:join', videoId);
    }
  };

  const leaveVideoRoom = (videoId: string) => {
    if (socket) {
      socket.emit('video:leave', videoId);
    }
  };

  const onVideoProgress = (callback: (data: VideoProgressEvent) => void) => {
    if (socket) {
      socket.on('video:progress', callback);
    }
  };

  const onVideoCompleted = (callback: (data: VideoCompletedEvent) => void) => {
    if (socket) {
      socket.on('video:completed', callback);
    }
  };

  const onVideoError = (callback: (data: VideoErrorEvent) => void) => {
    if (socket) {
      socket.on('video:error', callback);
    }
  };

  const onVideoUploaded = (callback: (data: VideoUploadedEvent) => void) => {
    if (socket) {
      socket.on('video:uploaded', callback);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinVideoRoom,
    leaveVideoRoom,
    onVideoProgress,
    onVideoCompleted,
    onVideoError,
    onVideoUploaded,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

