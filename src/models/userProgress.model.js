const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "User ID is required"],
      unique: true,
    },
    solvedProblems: [
      {
        problem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "problem",
          required: true,
        },
        submissionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "submission",
        },
        solvedAt: {
          type: Date,
          default: Date.now,
        },
        language: {
          type: String,
          enum: ["python", "java", "cpp", "c", "javascript", "js","php"],
        },
      },
    ],
    attemptedProblems: [
      {
        problem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "problem",
          required: true,
        },
        attempts: {
          type: Number,
          default: 0,
        },
        submissionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "submission",
        },
      },
    ],
    participatedContests: [
      {
        contest: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "contest",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

userProgressSchema.index({ "solvedProblems.problem": 1 });
userProgressSchema.index({ "attemptedProblems.problem": 1 });
userProgressSchema.index({ "participatedContests.contest": 1 });

const userProgressModel = mongoose.model("userProgress", userProgressSchema);

module.exports = userProgressModel;
