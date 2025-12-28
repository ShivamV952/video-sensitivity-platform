import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["viewer", "editor", "admin"],
    default: "viewer",
  },
});

export default mongoose.model("User", userSchema);
