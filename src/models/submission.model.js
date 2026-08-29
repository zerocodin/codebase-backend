const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "problem",
      required: [true, "Problem ID is required"],
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "contest",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "User ID is required"],
    },
    code: {
      type: String,
      required: [true, "Code is required"],
    },
    language: {
      type: String,
      enum: ["python", "java", "cpp", "c", "javascript", "js", "php"],
      required: [true, "Programming language is required"],
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "RUNNING",
        "ACCEPTED",
        "WRONG_ANSWER",
        "TIME_LIMIT_EXCEEDED",
        "MEMORY_LIMIT_EXCEEDED",
        "RUNTIME_ERROR",
        "COMPILATION_ERROR",
        "INTERNAL_ERROR",
      ],
      default: "PENDING",
    },
    score: {
      type: Number,
      default: 0,
    },
    executionTime: {
      type: Number,
      default: 0,
    },
    memoryUsed: {
      type: Number,
      default: 0,
    },
    testResults: [
      {
        testCaseType: {
          type: String,
          enum: ["SAMPLE", "HIDDEN"],
          default: "HIDDEN",
        },
        status: {
          type: String,
          enum: ["PASSED", "FAILED", "ERROR", "SKIPPED"],
        },
        input: {
          type: String,
        },
        expectedOutput: {
          type: String,
        },
        actualOutput: {
          type: String,
        },
        executionTime: {
          type: Number,
        },
        memoryUsed: {
          type: Number,
        },
        errorMessage: {
          type: String,
        },
      },
    ],
    errorMessage: {
      type: String,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
submissionSchema.index({ user: 1, problem: 1 });
submissionSchema.index({ contest: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ submittedAt: -1 });
submissionSchema.index({ problem: 1, isCorrect: 1 });

// Virtual for checking if submission is from contest
submissionSchema.virtual("isContestSubmission").get(function () {
  return !!this.contest;
});

// Method to update problem stats
submissionSchema.statics.updateProblemStats = async function (problemId) {
  const Problem = mongoose.model("problem");

  const stats = await this.aggregate([
    { $match: { problem: new mongoose.Types.ObjectId(problemId) } },
    {
      $group: {
        _id: "$problem",
        totalSubmissions: { $sum: 1 },
        acceptedSubmissions: {
          $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] },
        },
      },
    },
  ]);

  if (stats.length > 0) {
    const { totalSubmissions, acceptedSubmissions } = stats[0];
    await Problem.findByIdAndUpdate(problemId, {
      solvedCount: acceptedSubmissions,
      // You can add more stats if needed
    });
  }
};

const submissionModel = mongoose.model("submission", submissionSchema);

module.exports = submissionModel;