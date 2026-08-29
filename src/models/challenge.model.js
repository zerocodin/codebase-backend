const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim:true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PROBLEM", "QUIZ", "NOTE"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // Problem specific fields
    problemData: {
      inputFormat: String,
      outputFormat: String,
      sampleInput: String,
      sampleOutput: String,
    },
    // Quiz specific fields
    quizData: {
      options: [
        {
          text: { type: String, required: true },
          isCorrect: { type: Boolean, default: false },
        },
      ],
      correctOptionIndex: Number,
    },
    // Note specific fields
    noteData: {
      content: String,
      imageUrl:String,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Indexes
challengeSchema.index({ createdBy: 1, createdAt: -1 });
challengeSchema.index({ type: 1 });
challengeSchema.index({ title: "text", description: "text" });

const challengeModel = mongoose.model("Challenge", challengeSchema);

module.exports = challengeModel;
