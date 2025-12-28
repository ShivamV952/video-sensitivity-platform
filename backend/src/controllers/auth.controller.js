import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import User from "../models/User.js";

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Register new user
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name) {
      return next(new ApiError(400, "Email, password, and name are required"));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(409, "User with this email already exists"));
    }

    // Create user (role can only be set by admin, default is viewer)
    const userRole =
      role && ["admin", "editor"].includes(role) ? role : "viewer";

    let user;
    try {
      user = await User.create({
        email,
        password,
        name,
        role: userRole,
      });
    } catch (mongooseError) {
      // Handle Mongoose validation errors
      if (mongooseError.name === "ValidationError") {
        const messages = Object.values(mongooseError.errors)
          .map((err) => err.message)
          .join(", ");
        return next(new ApiError(400, messages));
      }
      // Handle duplicate key error
      if (mongooseError.code === 11000) {
        return next(new ApiError(409, "User with this email already exists"));
      }
      throw mongooseError;
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return next(new ApiError(400, "Email and password are required"));
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    if (!user.isActive) {
      return next(
        new ApiError(
          401,
          "Account is deactivated. Please contact administrator."
        )
      );
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
