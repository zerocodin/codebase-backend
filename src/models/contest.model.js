const mongoose = require("mongoose");

const contestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Contest description is required"],
      trim: true,
    },
    contestType: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PRIVATE", // for a private contest
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: [30, "Duration must be at least 30 minutes"],
    },
    status: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED", "ARCHIVED"],
      default: "UPCOMING",
    },
    problems: [
      {
        problem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "problem",
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        points: {
          type: Number,
        },
      },
    ],
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        solved: {
          type: [Number], // [1, 2, 3, ...]
          default: [],
        },
        score: {
          type: Number,
          default: 0,
        },
        rank: {
          type: Number,
        },
        wrongAttempts: {
          type: Number,
          default: 0,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

contestSchema.index({ startDate: 1, status: 1 });
contestSchema.index({ createdBy: 1 });
contestSchema.index({ contestType: 1 });
contestSchema.index({ status: 1 });

const contestModel = mongoose.model("contest", contestSchema);

module.exports = contestModel;
