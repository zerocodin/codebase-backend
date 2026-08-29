const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Problem title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD", "EXPERT"],
      default: "MEDIUM",
    },
    problemStatus: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "COMPLETED"],
      default: "UPCOMING",
    },
    tags: {
      type: [String],
      default: [],
    },
    inputFormat: {
      type: String,
      required: [true, "input format is required"],
      trim: true,
    },
    outputFormat: {
      type: String,
      required: [true, "output format is required"],
      trim: true,
    },
    constraints: {
      type: String,
      required: [true, "Constraints are required"],
      trim: true,
    },
    solvedCount: {
      type: Number,
      default: 0,
    },
    testCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "testCase",
      required: true,
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "contest",
      required: true,
    },
  },
  { timestamps: true },
);

problemSchema.index({ title: "text" }); 
problemSchema.index({ tags: 1 }); 
problemSchema.index({ difficulty: 1 }); 
problemSchema.index({ contest: 1 }); 
problemSchema.index({ createdAt: -1 });

const problemModel = mongoose.model("problem", problemSchema);

module.exports = problemModel;
