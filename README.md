# Video Sensitivity Platform

A full-stack web application for uploading, processing, and analyzing videos for content sensitivity using FFmpeg. The platform provides real-time video processing with sensitivity scoring, user authentication, and role-based access control.

## 🎯 Features

- **Video Upload & Processing**: Upload videos and process them asynchronously
- **FFmpeg-Based Analysis**: Real video analysis using FFmpeg (not random calculations)
  - Metadata extraction (duration, resolution, codec, bitrate)
  - Brightness analysis using signalstats
  - Scene change detection
  - Sensitivity scoring based on video characteristics
- **Real-Time Updates**: Socket.io integration for live processing progress
- **User Authentication**: JWT-based authentication system
- **Role-Based Access Control**: Three user roles (viewer, editor, admin)
- **Video Library**: Browse and manage uploaded videos
- **Video Streaming**: Stream videos with range request support
- **Modern UI**: React + TypeScript frontend with Tailwind CSS

## 🏗️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.io** for real-time communication
- **FFmpeg** (via fluent-ffmpeg) for video processing
- **JWT** for authentication
- **Multer** for file uploads

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Socket.io Client** for real-time updates
- **Tailwind CSS** for styling
- **Axios** for API calls

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **MongoDB** (running locally or connection string)
- **FFmpeg** (required for video processing)

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [FFmpeg official website](https://ffmpeg.org/download.html) and add to PATH.

**Verify installation:**
```bash
ffmpeg -version
ffprobe -version
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd video-sensitivity-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/video-sensitivity-platform
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
UPLOAD_PATH=./uploads/videos
MAX_FILE_SIZE=524288000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Or run directly
mongod
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📁 Project Structure

```
video-sensitivity-platform/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files (DB, env, socket)
│   │   ├── controllers/      # Route controllers
│   │   ├── middlewares/      # Auth, RBAC, upload middlewares
│   │   ├── models/           # MongoDB models (User, Video)
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic (sensitivity, video processing)
│   │   ├── utils/            # Utility functions
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # Server entry point
│   ├── uploads/              # Uploaded video files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/              # API client setup
│   │   ├── components/       # React components
│   │   ├── context/          # React contexts (Auth, Socket)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── types/            # TypeScript type definitions
│   │   └── main.tsx          # App entry point
│   └── package.json
│
└── README.md
```

## 🔐 User Roles

The platform supports three user roles:

- **Viewer**: Can view and upload videos
- **Editor**: Can view, upload, edit, and delete videos
- **Admin**: Full access including viewing all users' videos

## 🎬 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Videos
- `POST /api/videos/upload` - Upload a video
- `GET /api/videos` - Get all videos (with filters)
- `GET /api/videos/:id` - Get video by ID
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/:id/status` - Get processing status
- `GET /api/videos/:id/stream` - Stream video

## 🔄 Video Processing Flow

1. **Upload**: User uploads a video file
2. **Storage**: File is saved to `backend/uploads/videos/`
3. **Metadata Extraction**: FFmpeg extracts video metadata (duration, resolution, codec, bitrate)
4. **Sensitivity Analysis**: 
   - Brightness analysis using FFmpeg signalstats
   - Scene change detection
   - Score calculation based on video characteristics
5. **Real-Time Updates**: Progress updates sent via Socket.io
6. **Completion**: Video status updated to "completed" with sensitivity results

## 📊 Sensitivity Analysis

The sensitivity score (0-100) is calculated based on:

- **Resolution characteristics** (20%)
- **Bitrate patterns** (20%)
- **Duration analysis** (15%)
- **Brightness deviations** (15%)
- **Scene change frequency** (10%)
- **Audio presence** (5%)
- **File size consistency** (10%)

**Status Levels:**
- **Safe** (0-50): Content is safe for general viewing
- **Safe with warnings** (50-70): Minor warnings, may require review
- **Flagged** (70-100): Manual review recommended

## 🔌 Socket.io Events

### Client → Server
- `video:join` - Join a video room for updates
- `video:leave` - Leave a video room

### Server → Client
- `video:uploaded` - Video upload completed
- `video:progress` - Processing progress update
- `video:completed` - Video processing completed
- `video:error` - Processing error occurred

## 🛠️ Development

### Backend Scripts
```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
```

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000                                    # Server port
MONGO_URI=mongodb://localhost:27017/...     # MongoDB connection string
JWT_SECRET=your-secret-key                   # JWT signing secret
JWT_EXPIRES_IN=7d                           # JWT expiration time
NODE_ENV=development                        # Environment (development/production)
UPLOAD_PATH=./uploads/videos                # Video upload directory
MAX_FILE_SIZE=524288000                     # Max file size in bytes (500MB)
```

## 🐛 Troubleshooting

### FFmpeg Not Found
If you get "Cannot find ffprobe" error:
1. Verify FFmpeg is installed: `ffmpeg -version`
2. Ensure FFmpeg is in your system PATH
3. Restart your Node.js server after installing FFmpeg

### MongoDB Connection Issues
1. Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
2. Check your `MONGO_URI` in `.env` file
3. Verify MongoDB is accessible on the specified port (default: 27017)

### Upload Failures
1. Check `UPLOAD_PATH` directory exists and is writable
2. Verify `MAX_FILE_SIZE` is sufficient for your videos
3. Check file permissions on the upload directory

## 📦 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure MongoDB connection string
4. Set up proper file storage (consider cloud storage for production)
5. Configure CORS for your frontend domain

### Frontend
1. Build the application: `npm run build`
2. Serve the `dist` folder using a web server (nginx, Apache, etc.)
3. Configure API endpoint in production

## 🔒 Security Considerations

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement rate limiting for uploads
- Validate and sanitize file uploads
- Consider using cloud storage (S3, etc.) instead of local storage
- Implement proper CORS policies
- Add input validation and sanitization

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Note**: This platform uses FFmpeg for real video analysis. Make sure FFmpeg is installed on your system before running the application.
