import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new ApiError(401, "Authentication required. Please login.");
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new ApiError(401, "User not found. Token is invalid.");
    }

    if (!user.isActive) {
      throw new ApiError(401, "User account is deactivated.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid token. Please login again."));
    }
    next(error);
  }
};
