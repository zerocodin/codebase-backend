const express = require("express");
const commentController = require("../controllers/comment.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Protected routes
router.post("/:challengeId", authMiddleware, commentController.addComment);
router.delete("/:commentId", authMiddleware, commentController.deleteComment);
router.post(
  "/:commentId/like",
  authMiddleware,
  commentController.toggleLikeComment,
);

module.exports = router;
