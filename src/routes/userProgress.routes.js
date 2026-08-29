const express = require("express");
const userProgressController = require("../controllers/userProgress.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();
// public routes
router.get("/public/:userId", userProgressController.getPublicUserStats);

// Protected routes
router.get("/", authMiddleware, userProgressController.getUserProgress);
router.get("/stats", authMiddleware, userProgressController.getUserStats);

module.exports = router;
