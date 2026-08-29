const mongoose = require("mongoose");
const commentModel = require("../models/comment.model");
const challengeModel = require("../models/challenge.model");

// ADD COMMENT
const addComment = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge ID",
      });
    }

    const challenge = await challengeModel.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    const comment = await commentModel.create({
      challenge: challengeId,
      user: userId,
      content: content.trim(),
    });

    challenge.comments.push(comment._id);
    await challenge.save();

    await comment.populate("user", "username name profileImage");

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

// DELETE COMMENT
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await commentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this comment",
      });
    }

    await challengeModel.findByIdAndUpdate(comment.challenge, {
      $pull: { comments: commentId },
    });

    await commentModel.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

// LIKE/UNLIKE COMMENT
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await commentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const likedIndex = comment.likedBy.indexOf(userId);

    if (likedIndex === -1) {
      comment.likedBy.push(userId);
      comment.likes += 1;
    } else {
      comment.likedBy.splice(likedIndex, 1);
      comment.likes -= 1;
    }

    await comment.save();

    return res.status(200).json({
      success: true,
      message: likedIndex === -1 ? "Comment liked" : "Comment unliked",
      data: {
        likes: comment.likes,
        isLiked: likedIndex === -1,
      },
    });
  } catch (error) {
    console.error("Toggle comment like error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle comment like",
    });
  }
};

module.exports = {
  addComment,
  deleteComment,
  toggleLikeComment,
};