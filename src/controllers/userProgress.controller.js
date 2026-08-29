const mongoose = require("mongoose");

const userProgressModel = require("../models/userProgress.model");
const contestModel = require('../models/contest.model')

const initializeUserProgress = async (userId) => {
  try {
    const existing = await userProgressModel.findOne({ user: userId });
    if (existing) {
      return existing;
    }

    const progress = await userProgressModel.create({
      user: userId,
      solvedProblems: [],
      attemptedProblems: [],
      participatedContests: [],
    });

    return progress;
  } catch (error) {
    console.error("Initialize user progress error:", error);
    throw error;
  }
};

const addAttemptedProblem = async (userId, problemId, options = {}) => {
  try {
    const { status = "WRONG_ANSWER", submissionId } = options;

    let progress = await userProgressModel.findOne({ user: userId });
    console.log(userId, problemId);

    if (!progress) {
      progress = await initializeUserProgress(userId);
    }

    /**
     * 
    const alreadySolved = progress.solvedProblems.some(
      (s) => s.problem.toString() === problemId.toString(),
    );

    if (alreadySolved) {
      return progress;
    } */

    const existingAttempt = progress.attemptedProblems.find(
      (a) => a.problem.toString() === problemId.toString(),
    );

    if (existingAttempt) {
      existingAttempt.attempts += 1;
      existingAttempt.submissionId =
        submissionId || existingAttempt.submissionId;
    } else {
      progress.attemptedProblems.push({
        problem: problemId,
        attempts: 1,
        submissionId: submissionId || null,
      });
    }

    await progress.save();

    return progress;
  } catch (error) {
    console.error("Add attempted problem error:", error);
    throw error;
  }
};

const addSolvedProblem = async (userId, problemId, options = {}) => {
  try {
    const { language, submissionId } = options;

    let progress = await userProgressModel.findOne({ user: userId });

    if (!progress) {
      progress = await initializeUserProgress(userId);
    }

    const alreadySolved = progress.solvedProblems.some(
      (s) => s.problem.toString() === problemId.toString(),
    );

    if (alreadySolved) {
      const solvedEntry = progress.solvedProblems.find(
        (s) => s.problem.toString() === problemId.toString(),
      );
      solvedEntry.solvedAt = new Date();
      solvedEntry.language = language || solvedEntry.language;
      solvedEntry.submissionId = submissionId || solvedEntry.submissionId;

      await progress.save();
      return progress;
    }

    progress.solvedProblems.push({
      problem: problemId,
      solvedAt: new Date(),
      language: language || "unknown",
      submissionId: submissionId || null,
    });

    progress.attemptedProblems = progress.attemptedProblems.filter(
      (a) => a.problem.toString() !== problemId.toString(),
    );

    await progress.save();

    return progress;
  } catch (error) {
    console.error("Add solved problem error:", error);
    throw error;
  }
};

const addParticipatedContest = async (userId, contestId) => {
  try {
    if (!contestId) {
      return null;
    }

    let progress = await userProgressModel.findOne({ user: userId });

    if (!progress) {
      progress = await initializeUserProgress(userId);
    }

    const alreadyParticipated = progress.participatedContests.some(
      (p) => p.contest.toString() === contestId.toString(),
    );

    if (alreadyParticipated) {
      return progress;
    }

    // const userScore = participant?.score || 0;

    const contest = await contestModel.findById(contestId);
    let userScore = 0;

    if (contest) {
      const participant = contest.participants.find(
        (p) => p.user.toString() === userId.toString(),
      );
      if (participant) {
        userScore = participant.score || 0;
      }
    }

    progress.participatedContests.push({
      contest: contestId,
      registeredAt: new Date(),
      score: userScore || 0,
      rank: null,
      solvedProblems: [],
    });

    await progress.save();

    return progress;
  } catch (error) {
    console.error("Add participated contest error:", error);
    throw error;
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const progress = await userProgressModel.findOne({ user: userId });

    if (!progress) {
      return res.status(200).json({
        success: true,
        data: {
          solvedCount: 0,
          attemptedCount: 0,
          participatedCount: 0,
          totalSolved: 0,
          totalAttempted: 0,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        solvedCount: progress.solvedProblems.length,
        attemptedCount: progress.attemptedProblems.length,
        participatedCount: progress.participatedContests.length,
        totalSolved: progress.solvedProblems.length,
        totalAttempted:
          progress.attemptedProblems.length + progress.solvedProblems.length,
        recentSolved: progress.solvedProblems
          .sort((a, b) => b.solvedAt - a.solvedAt)
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
    });
  }
};

const getUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    let progress = await userProgressModel
      .findOne({ user: userId })
      .populate("solvedProblems.problem", "title difficulty tags")
      .populate("attemptedProblems.problem", "title difficulty tags")
      .populate(
        "participatedContests.contest",
        "name status startDate endDate",
      );

    if (!progress) {
      progress = await initializeUserProgress(userId);
      progress = await userProgressModel
        .findOne({ user: userId })
        .populate("solvedProblems.problem", "title difficulty tags")
        .populate("attemptedProblems.problem", "title difficulty tags")
        .populate(
          "participatedContests.contest",
          "name status startDate endDate",
        );
    }

    return res.status(200).json({
      success: true,
      data: {
        solvedCount: progress.solvedProblems.length,
        attemptedCount: progress.attemptedProblems.length,
        participatedCount: progress.participatedContests.length,
        solvedProblems: progress.solvedProblems,
        attemptedProblems: progress.attemptedProblems,
        participatedContests: progress.participatedContests,
      },
    });
  } catch (error) {
    console.error("Get user progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user progress",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getPublicUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const progress = await userProgressModel
      .findOne({ user: userId })
      .populate("solvedProblems.problem", "title difficulty tags")
      .populate("attemptedProblems.problem", "title difficulty tags")
      .populate(
        "participatedContests.contest",
        "name status startDate endDate",
      );

    if (!progress) {
      return res.status(200).json({
        success: true,
        data: {
          solvedCount: 0,
          attemptedCount: 0,
          participatedCount: 0,
          solvedProblems: [],
          attemptedProblems: [],
          participatedContests: [],
          accuracy: 0,
        },
      });
    }

    const solvedCount = progress.solvedProblems?.length || 0;
    const attemptedCount = progress.attemptedProblems?.length || 0;
    const totalAttempts = solvedCount + attemptedCount;
    const accuracy =
      totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : 0;

    // Sort solved problems by solvedAt
    const sortedSolved = [...(progress.solvedProblems || [])].sort(
      (a, b) => new Date(b.solvedAt) - new Date(a.solvedAt),
    );

    return res.status(200).json({
      success: true,
      data: {
        solvedCount,
        attemptedCount,
        participatedCount: progress.participatedContests?.length || 0,
        accuracy,
        solvedProblems: sortedSolved.slice(0, 10), // Last 10 solved problems
        attemptedProblems: progress.attemptedProblems || [],
        participatedContests: progress.participatedContests || [],
      },
    });
  } catch (error) {
    console.error("Get public user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update contest score and rank
 */
const updateContestResult = async (
  userId,
  contestId,
  score,
  rank,
  solvedProblems = [],
) => {
  try {
    const progress = await userProgressModel.findOne({ user: userId });

    if (!progress) {
      return null;
    }

    const contestEntry = progress.participatedContests.find(
      (p) => p.contest.toString() === contestId.toString(),
    );

    if (contestEntry) {
      // contestEntry.score = score || 0;
      contestEntry.rank = rank || null;
      if (solvedProblems.length > 0) {
        contestEntry.solvedProblems = solvedProblems;
      }
      await progress.save();
    }

    return progress;
  } catch (error) {
    console.error("Update contest result error:", error);
    throw error;
  }
};

module.exports = {
  initializeUserProgress,
  getUserProgress,
  getUserStats,
  addSolvedProblem,
  addAttemptedProblem,
  addParticipatedContest,
  updateContestResult,
  getPublicUserStats,
};
