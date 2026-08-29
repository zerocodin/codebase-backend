const mongoose = require("mongoose");
const challengeModel = require("../models/challenge.model");
const commentModel = require("../models/comment.model");
const userModel = require("../models/user.model");
const imagekit = require("../services/imagekit.service");

// CREATE CHALLENGE
const createChallenge = async (req, res) => {
  try {
    const { title, description, type, problemData, quizData, noteData } =
      req.body;
    const userId = req.user._id;

    if ((!title && !description) || !type) {
      return res.status(400).json({
        success: false,
        message: "Title or Description are required",
      });
    }

    const challengeData = {
      title,
      description,
      type,
      createdBy: userId,
    };

    // Add type-specific data
    if (type === "PROBLEM") {
      if (!problemData) {
        return res.status(400).json({
          success: false,
          message: "Problem data is required for PROBLEM type",
        });
      }
      challengeData.problemData = problemData;
    } else if (type === "QUIZ") {
      if (!quizData || !quizData.options || quizData.options.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Quiz requires at least 2 options",
        });
      }
      challengeData.quizData = quizData;
    } else if (type === "NOTE") {
      if (!noteData || !noteData.content) {
        return res.status(400).json({
          success: false,
          message: "Note content is required",
        });
      }
      challengeData.noteData = noteData;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge type. Must be PROBLEM, QUIZ, or NOTE",
      });
    }

    const challenge = await challengeModel.create(challengeData);

    await challenge.populate("createdBy", "username name profileImage");

    return res.status(201).json({
      success: true,
      message: "Challenge created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create challenge",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPLOAD NOTE IMAGE
const uploadNoteImage = async (req, res) => {
  try {
    const userId = req.user._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // Generate unique filename
    const fileName = `note-${userId}-${Date.now()}`;

    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: fileName,
      folder: "/note-images",
      tags: ["note", "challenge"],
    });

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageUrl: uploadResponse.url,
        fileId: uploadResponse.fileId,
      },
    });
  } catch (error) {
    console.error("Upload note image error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET ALL CHALLENGES
const getAllChallenges = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (type && type !== "ALL") filter.type = type;
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const challenges = await challengeModel
      .find(filter)
      .populate("createdBy", "username name profileImage")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username name profileImage",
        },
        options: { sort: { createdAt: -1 } },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await challengeModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        challenges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch challenges",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET CHALLENGE BY ID
const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge ID",
      });
    }

    const challenge = await challengeModel
      .findById(id)
      .populate("createdBy", "username name profileImage")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username name profileImage",
        },
        options: { sort: { createdAt: -1 } },
      });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch challenge",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// LIKE/UNLIKE CHALLENGE
const toggleLikeChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge ID",
      });
    }

    const challenge = await challengeModel.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    const likedIndex = challenge.likedBy.indexOf(userId);

    if (likedIndex === -1) {
      challenge.likedBy.push(userId);
      challenge.likes += 1;
    } else {
      challenge.likedBy.splice(likedIndex, 1);
      challenge.likes -= 1;
    }

    await challenge.save();

    return res.status(200).json({
      success: true,
      message: likedIndex === -1 ? "Challenge liked" : "Challenge unliked",
      data: {
        likes: challenge.likes,
        isLiked: likedIndex === -1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle like",
    });
  }
};

//DELETE CHALLENGE
const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge ID",
      });
    }

    const challenge = await challengeModel.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    // Check if user is the creator
    if (challenge.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this challenge",
      });
    }

    // Delete all comments associated with this challenge
    await commentModel.deleteMany({ challenge: id });

    // Delete the challenge
    await challengeModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Challenge deleted successfully",
    });
  } catch (error) {
    console.error("Delete challenge error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete challenge",
    });
  }
};

module.exports = {
  createChallenge,
  getAllChallenges,
  getChallengeById,
  toggleLikeChallenge,
  deleteChallenge,
  uploadNoteImage,
};
