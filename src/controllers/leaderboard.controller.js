const mongoose = require("mongoose");
const contestModel = require("../models/contest.model");

/**
 * Get leaderboard for a contest
 * @route GET /api/contests/:id/leaderboard
 * @access Public
 */
const getLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await contestModel
      .findById(id)
      .populate("participants.user", "username name profileImage")
      .populate("problems.problem", "title")
      .select("name problems participants status");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    // Sort participants by score (descending)
    const sortedParticipants = contest.participants
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        return (a.wrongAttempts || 0) - (b.wrongAttempts || 0); 
      })
      .map((p, index) => ({
        rank: index + 1,
        user: p.user,
        score: p.score,
        solved: p.solved || [],
        wrongAttempts: p.wrongAttempts || 0,
        registeredAt: p.registeredAt,
      }));

    // Get problem details for the contest
    const problemDetails = contest.problems
      .sort((a, b) => a.order - b.order)
      .map((p, index) => ({
        order: p.order || index + 1,
        id: p.problem?._id || p.problem,
        title: p.problem?.title || `Problem ${p.order || index + 1}`,
        points: p.points || (p.order || index + 1) * 10,
      }));

    return res.status(200).json({
      success: true,
      data: {
        contestName: contest.name,
        status: contest.status,
        totalParticipants: sortedParticipants.length,
        problemDetails: problemDetails,
        participants: sortedParticipants,
      },
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get user's rank in a contest
 * @route GET /api/contests/:id/rank
 * @access Private
 */
const getUserRank = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await contestModel
      .findById(id)
      .populate("participants.user", "username name profileImage");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    // Find user's rank
    const sortedParticipants = contest.participants.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.wrongAttempts || 0) - (b.wrongAttempts || 0);
    });

    const userRank = sortedParticipants.findIndex(
      (p) => p.user._id.toString() === userId.toString(),
    );

    if (userRank === -1) {
      return res.status(404).json({
        success: false,
        message: "User not registered for this contest",
      });
    }

    const participant = sortedParticipants[userRank];

    return res.status(200).json({
      success: true,
      data: {
        rank: userRank + 1,
        totalParticipants: sortedParticipants.length,
        score: participant.score,
        solved: participant.solved || [],
        wrongAttempts: participant.wrongAttempts || 0,
      },
    });
  } catch (error) {
    console.error("Get user rank error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user rank",
    });
  }
};

module.exports = {
  getLeaderboard,
  getUserRank,
};