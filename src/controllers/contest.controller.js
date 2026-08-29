const mongoose = require("mongoose");
const contestModel = require("../models/contest.model");
const problemModel = require("../models/problem.model");
const testCaseModel = require("../models/testCase.model");
const submissionModel = require('../models/submission.model')

const calculateProblemPoints = (order) => {
  return order * 10; // Problem 1 = 10, Problem 2 = 20, etc.
};

const createContest = async (req, res) => {
  try {
    const { name, description, contestType, startDate, endDate, duration } =
      req.body;

    if (!name || !description || !startDate || !endDate || !duration) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const time = (end - start) / (1000 * 60);
    const timeInMinutes = (end - start) / (1000 * 60);

    if (start >= end || Math.abs(timeInMinutes - duration) > 1 || now > start) {
      return res.status(400).json({
        message: "Set-up time properly",
        success: false,
      });
    }

    const existingContest = await contestModel.findOne({ name });

    if (existingContest) {
      return res.status(400).json({
        success: false,
        message: "Make a different contest name",
      });
    }

    const contest = await contestModel.create({
      name,
      description,
      contestType: contestType || "PRIVATE",
      startDate: start,
      endDate: end,
      duration,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Contest created successfully",
      success: true,
      contest: {
        name: contest.name,
        id: contest._id,
        contestType: contest.contestType,
        createdBy: contest.createdBy,
      },
    });
  } catch (error) {
    console.error("Create contest error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Contest name already exists",
        success: false,
      });
    }

    return res.status(500).json({
      message: "Failed to create contest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateContestStatus = async (req, res) => {
  try {
    const now = new Date();

    const contests = await contestModel.find({
      status: { $in: ["UPCOMING", "ONGOING"] },
    });

    for (const contest of contests) {
      let statusChanged = false;
      let newStatus = contest.status;
      let isActive = false;

      if (
        contest.startDate <= now &&
        contest.endDate >= now &&
        contest.status === "UPCOMING"
      ) {
        newStatus = "ONGOING";
        statusChanged = true;
        isActive = true;

        await problemModel.updateMany(
          { contest: contest._id },
          { problemStatus: "ONGOING" },
        );
      }

      if (contest.endDate < now && contest.status !== "COMPLETED") {
        newStatus = "COMPLETED";
        statusChanged = true;
        isActive = false;

        await problemModel.updateMany(
          { contest: contest._id },
          { problemStatus: "COMPLETED" },
        );
      }

      if (statusChanged) {
        contest.status = newStatus;
        contest.isActive = isActive;

        await contest.save();
      }
    }
  } catch (error) {
    console.error("Helper status update error", error);
  }
};

const getUpcomingContests = async (req, res) => {
  try {
    const now = new Date();

    await updateContestStatus();

    const contests = await contestModel
      .find({
        isActive: false,
        startDate: { $gt: now },
        status: "UPCOMING",
      })
      .populate("createdBy", "username name")
      .sort({ startDate: 1 });

    const formattedContests = contests.map((contest) => ({
      contestId: contest._id,
      name: contest.name,
      createdBy: contest.createdBy,
      duration: contest.duration,
      date: contest.startDate,
    }));

    return res.status(200).json({
      success: true,
      count: formattedContests.length,
      data: formattedContests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed t fetch upcoming contest data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getOngoingContests = async (req, res) => {
  try {
    const now = new Date();

    await updateContestStatus();

    const contests = await contestModel
      .find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: "ONGOING",
      })
      .populate("createdBy", "username name")
      .sort({ startDate: 1 });

    const formattedContests = contests.map((contest) => ({
      contestId: contest._id,
      name: contest.name,
      createdBy: contest.createdBy,
      duration: contest.duration,
      date: contest.startDate,
    }));

    return res.status(200).json({
      success: true,
      count: formattedContests.length,
      data: formattedContests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed t fetch upcoming contest data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getCompletedContests = async (req, res) => {
  try {
    const now = new Date();

    await updateContestStatus();

    const contests = await contestModel
      .find({
        isActive: false,
        endDate: { $lt: now },
        status: "COMPLETED",
      })
      .populate("createdBy", "username name")
      .sort({ startDate: 1 });

    const formattedContests = contests.map((contest) => ({
      contestId: contest._id,
      name: contest.name,
      createdBy: contest.createdBy,
      duration: contest.duration,
      date: contest.startDate,
    }));

    return res.status(200).json({
      success: true,
      count: formattedContests.length,
      data: formattedContests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed t fetch upcoming contest data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getContestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid contest ID",
        success: false,
      });
    }

    const contestStatus = await contestModel.findById(id);

    if (!contestStatus) {
      return res.status(404).json({
        message: "Contest not found",
        success: false,
      });
    }

    const now = new Date();

    if (contestStatus.endDate < now) {
      contestStatus.status = "COMPLETED";

      await contestStatus.save();
    }

    const contest = await contestModel
      .findById(id)
      .populate("createdBy", "username")
      .populate("problems.problem", "title _id")
      .populate("participants.user", "username name");

    if (!contest) {
      return res.status(404).json({
        message: "Contest not found",
        success: false,
      });
    }

    const formattedContests = {
      id: contest._id,
      name: contest.name,
      description: contest.description,
      contestType: contest.contestType,
      startDate: contest.startDate,
      endDate: contest.endDate,
      duration: contest.duration,
      status: contest.status,
      createdBy: contest.createdBy.username,
      participants: contest.participants || [],
      problems: contest.problems.map((p) => ({
        id: p.problem._id,
        name: p.problem.title,
        order: p.order,
      })),
    };

    return res.status(200).json({
      success: true,
      data: formattedContests,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch contest data",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await contestModel.findById(id);
    if (!contest) {
      return res.status(404).json({
        message: "Contest not found",
        success: false,
      });
    }

    if (contest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to archive this contest",
        success: false,
      });
    }

    if (contest.status === "ONGOING" || contest.status === "COMPLETED") {
      return res.status(400).json({
        message: `Cannot delete ${contest.status} contest`,
        success: false,
      });
    }

    const problems = await problemModel.find({ contest: id });

    if (problems.length > 0) {
      const testCaseIds = problems.map((p) => p.testCase);

      await testCaseModel.deleteMany({ _id: { $in: testCaseIds } });

      await problemModel.deleteMany({ contest: id });
    }

    const deletedContest = await contestModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Contest and all associated problems/test cases permanently deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete contest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateContest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contestType, startDate, endDate, duration } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid contest ID",
        success: false,
      });
    }

    const contest = await contestModel.findById(id);

    if (!contest) {
      return res.status(404).json({
        message: "Contest not found",
        success: false,
      });
    }

    if (contest.status === "COMPLETED") {
      return res.status(400).json({
        message: `Can't update a ${contest.status.toLowerCase()} contest`,
        success: false,
      });
    }

    const updateData = {};
    const now = new Date();

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (contestType) updateData.contestType = contestType;

    let start = contest.startDate;
    let end = contest.endDate;

    if (startDate) {
      start = new Date(startDate);
    }
    if (endDate) {
      end = new Date(endDate);
    }

    if (endDate) {
      if (end <= start) {
        return res.status(400).json({
          message: "Fill date correctly",
          success: false,
        });
      }

      updateData.startDate = start;
      updateData.endDate = end;

      const calculatedDuration = (end - start) / (1000 * 60);
      updateData.duration = Math.round(calculatedDuration);
    }

    if (duration) {
      const currentStart = updateData.startDate || contest.startDate;
      const currentEnd = updateData.endDate || contest.endDate;
      const calculatedDuration = (currentEnd - currentStart) / (1000 * 60);

      if (Math.abs(calculatedDuration - duration) > 1) {
        return res.status(400).json({
          message: "Duration doesn't match with dates",
          success: false,
        });
      }
      updateData.duration = duration;
    }

    const finalStart = updateData.startDate || contest.startDate;
    const finalEnd = updateData.endDate || contest.endDate;

    if (finalStart <= now && finalEnd >= now) {
      updateData.status = "ONGOING";
    } else if (finalEnd < now) {
      updateData.status = "COMPLETED";
    } else {
      updateData.status = "UPCOMING";
    }

    const updatedContest = await contestModel
      .findByIdAndUpdate(id, updateData, {
        returnDocument: "after",
        runValidators: true,
      })
      .populate("createdBy", "username name");

    return res.status(200).json({
      message: "Contest updated successfully",
      success: true,
      data: updatedContest,
    });
  } catch (error) {
    console.error("Update contest error:", error);
    return res.status(400).json({
      message: "Failed to update contest",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const registerForContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await contestModel.findById(id);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    if (
      contest.status === "COMPLETED" ||
      contest.status === "CANCELLED" ||
      contest.status === "ONGOING"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot register for a ${contest.status.toLowerCase()} contest`,
      });
    }

    const now = new Date();
    if (now > contest.startDate) {
      return res.status(400).json({
        success: false,
        message: "Registration is closed. Contest has already started.",
      });
    }

    const alreadyRegistered = contest.participants.some(
      (p) => p.user.toString() === userId.toString(),
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: "You are already registered for this contest",
      });
    }

    contest.participants.push({
      user: userId,
      solved: [],
      score: 0,
      rank: null,
    });

    await contest.save();

    const updatedContest = await contestModel
      .findById(contest._id)
      .populate("participants.user", "username name email profileImage")
      .populate("problems.problem", "title difficulty");

    return res.status(200).json({
      success: true,
      message: "Successfully registered for the contest",
      data: {
        contest: {
          id: updatedContest._id,
          name: updatedContest.name,
          status: updatedContest.status,
          participantsCount: updatedContest.participants.length,
        },
      },
    });
  } catch (error) {
    console.error("Register for contest error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register for contest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const unregisterFromContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    const contest = await contestModel.findById(id);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    const now = new Date();
    if (now > contest.startDate) {
      return res.status(400).json({
        success: false,
        message: "Cannot unregister. Contest has already started.",
      });
    }

    const participantIndex = contest.participants.findIndex(
      (p) => p.user.toString() === userId.toString(),
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "You are not registered for this contest",
      });
    }

    contest.participants.splice(participantIndex, 1);
    await contest.save();

    return res.status(200).json({
      success: true,
      message: "Successfully unregistered from the contest",
      data: {
        contestId: contest._id,
        participantsCount: contest.participants.length,
      },
    });
  } catch (error) {
    console.error("Unregister from contest error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unregister from contest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getContestByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    await updateContestStatus();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
      });
    }

    const contests = await contestModel
      .find({ createdBy: id })
      .populate("createdBy", "username name")
      .sort({ startDate: -1 });

    if (!contests || contests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No contests found for this user",
        data: [],
        count: 0,
      });
    }

    const formattedContests = contests.map((contest) => ({
      contestId: contest._id,
      name: contest.name,
      contestType: contest.contestType,
      startDate: contest.startDate,
      endDate: contest.endDate,
      duration: contest.duration,
      status: contest.status,
    }));

    return res.status(200).json({
      success: true,
      count: formattedContests.length,
      data: formattedContests,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch contest data",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get contest statistics with per-problem data
 * @route GET /api/contests/:id/stats
 * @access Public
 */
const getContestStats = async (req, res) => {
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
      .populate("problems.problem", "title")
      .populate("participants.user", "username name");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    // Get all submissions for this contest
    const submissions = await submissionModel.find({
      contest: id,
    }).populate("problem", "title");

    // Calculate statistics per problem
    const problemStats = contest.problems.map((p) => {
      const problemId = p.problem._id.toString();
      
      // All submissions for this problem in this contest
      const problemSubmissions = submissions.filter(
        (s) => s.problem._id.toString() === problemId
      );
      
      // Correct submissions for this problem
      const correctSubmissions = problemSubmissions.filter(
        (s) => s.isCorrect === true
      );
      
      const totalSubmissions = problemSubmissions.length;
      const solvedCount = correctSubmissions.length;
      const accuracy = totalSubmissions > 0 
        ? Math.round((solvedCount / totalSubmissions) * 100) 
        : 0;

      return {
        problemId: p.problem._id,
        title: p.problem.title,
        order: p.order,
        points: p.points || p.order * 10,
        solvedCount: solvedCount,
        submissions: totalSubmissions,
        accuracy: accuracy,
      };
    });

    // Overall stats
    const totalAttempts = submissions.length;
    const totalCorrect = submissions.filter(s => s.isCorrect === true).length;
    const totalParticipants = contest.participants.length;

    return res.status(200).json({
      success: true,
      data: {
        contestName: contest.name,
        status: contest.status,
        totalParticipants,
        totalSubmissions: totalAttempts,
        totalSolved: totalCorrect,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
        problemStats: problemStats, 
      },
    });

  } catch (error) {
    console.error("Get contest stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contest statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//  upper all function are ok

/**
 * Get all participants of a contest
 * @route GET /api/contests/:id/participants
 * @access Public
 */
const getContestParticipants = async (req, res) => {
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
      .populate("participants.user", "username name profileImage email")
      .select("participants name status");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    // Sort participants by score (descending)
    const sortedParticipants = contest.participants
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({
        rank: index + 1,
        user: p.user,
        score: p.score,
        solved: p.solved.length,
        registeredAt: p.registeredAt,
      }));

    return res.status(200).json({
      success: true,
      data: {
        contestName: contest.name,
        status: contest.status,
        totalParticipants: sortedParticipants.length,
        participants: sortedParticipants,
      },
    });
  } catch (error) {
    console.error("Get participants error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch participants",
    });
  }
};

module.exports = {
  createContest,
  getUpcomingContests,
  getOngoingContests,
  getCompletedContests,
  getContestById,
  getContestByUserId,
  updateContest,
  deleteContest,
  registerForContest,
  unregisterFromContest,

  getContestStats,
  getContestParticipants,
};
