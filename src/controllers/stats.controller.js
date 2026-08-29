const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const contestModel = require("../models/contest.model");
const problemModel = require("../models/problem.model");
const submissionModel = require("../models/submission.model");

/**
 * Get platform statistics
 * @route GET /api/stats
 * @access Public
 */
const getPlatformStats = async (req, res) => {
  try {
    // Get total users (only verified ones)
    const totalUsers = await userModel.countDocuments({
      isVerified: true,
      emailStatus: "RUNNING",
    });

    // Get total contests (all contests)
    const totalContests = await contestModel.countDocuments({
      isActive: false,
      status: { $in: ["ONGOING", "COMPLETED"] },
    });

    // Get total problems (only completed ones)
    const totalProblems = await problemModel.countDocuments({
      problemStatus: "COMPLETED",
    });

    // Get total submissions (all submissions)
    const totalSubmissions = await submissionModel.countDocuments();

    // Get recent activity (optional)
    // const recentSubmissions = await submissionModel
    //   .find()
    //   .sort({ submittedAt: -1 })
    //   .limit(5)
    //   .populate("user", "username name")
    //   .populate("problem", "title");

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalContests,
        totalProblems,
        totalSubmissions,
        // recentSubmissions,
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch platform statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getPlatformStats,
};
