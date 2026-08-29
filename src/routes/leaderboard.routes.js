const express = require("express");

const leaderboardController = require("../controllers/leaderboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Public routes
router.get("/:id", leaderboardController.getLeaderboard); 

// Protected routes

router.get("/:id/rank", authMiddleware, leaderboardController.getUserRank); 

module.exports = router;
