const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Must need to a valid name"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    username: {
      type: String,
      required: [true, "Enter an unique username"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },
    email: {
      type: String,
      required: [true, "Enter a valid email address"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Enter a strong password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
    },
    age: {
      type: Number,
    },
    profileImage: {
      type: String,
      // default: "default-profile.png",
    },
    emailStatus: {
      type: String,
      enum: ["REJECTED", "RUNNING", "INREVIEW", "VERIFIED"],
      default: "INREVIEW",
    },
    OTP: {
      type: Number,
      select: false,
    },
    OTPexprires: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    // new added
    challenges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Challenge",
      },
    ],
    accessToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

// Create indexes
userSchema.index({ createdAt: -1 });

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
