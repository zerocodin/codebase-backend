const express = require("express");
const challengeController = require("../controllers/challenge.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const uploadMiddleware = require("../middlewares/upload.middleware");

const router = express.Router();

// Public routes
router.get("/", challengeController.getAllChallenges);
router.get("/:id", challengeController.getChallengeById);

// Protected routes
router.post("/", authMiddleware, challengeController.createChallenge);
router.post(
  "/:id/like",
  authMiddleware,
  challengeController.toggleLikeChallenge,
);
router.delete("/:id", authMiddleware, challengeController.deleteChallenge);

router.post(
  "/upload-image",
  authMiddleware,
  uploadMiddleware.uploadSingleImage,
  challengeController.uploadNoteImage,
);

module.exports = router;
