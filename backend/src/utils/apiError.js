export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const errorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  // Handle Mongoose validation errors
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
    error = new ApiError(400, messages);
  }

  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    error = new ApiError(409, `${field} already exists`);
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired");
  }

  // If not an ApiError, create one
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const { statusCode, message } = error;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
