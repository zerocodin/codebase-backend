const mongoose = require("mongoose");
const axios = require("axios");

const submissionModel = require("../models/submission.model");
const problemModel = require("../models/problem.model");
const contestModel = require("../models/contest.model");
const testCaseModel = require("../models/testCase.model");
const { executeCode } = require("./execute.controller");
const userProgressController = require("./userProgress.controller");

// const PISTON_API_URL = "https://emkc.org/api/v2/piston";

const createSubmission = async (req, res) => {
  try {
    const { problemId, contestId, code, language } = req.body;
    const userId = req.user._id;

    if (!problemId || !code || !language) {
      return res.status(400).json({
        success: false,
        message: "Problem ID, code, and language are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
    }

    const problem = await problemModel.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    let contest = null;
    let isContestSubmission = false;
    let isContestOngoing = false;

    if (contestId) {
      if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contest ID",
        });
      }

      contest = await contestModel.findById(contestId);
      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "Contest not found",
        });
      }

      isContestSubmission = true;

      const now = new Date();
      isContestOngoing = now >= contest.startDate && now <= contest.endDate;

      if (!isContestOngoing) {
        return res.status(400).json({
          success: false,
          message: `Cannot submit to a contest that is ${contest.status.toLowerCase()}`,
        });
      }

      const isRegistered = contest.participants.some(
        (p) => p.user.toString() === userId.toString(),
      );

      if (!isRegistered) {
        return res.status(403).json({
          success: false,
          message: "You are not registered for this contest",
        });
      }

      const problemInContest = contest.problems.some(
        (p) => p.problem.toString() === problemId,
      );

      if (!problemInContest) {
        return res.status(400).json({
          success: false,
          message: "This problem does not belong to the specified contest",
        });
      }
    }

    const testCases = await testCaseModel
      .findById(problem.testCase)
      .select("+hiddenCases");

    if (!testCases) {
      return res.status(404).json({
        success: false,
        message: "Test cases not found for this problem",
      });
    }

    const allTestCases = [
      ...testCases.sampleCases.map((tc) => ({
        ...tc.toObject(),
        type: "SAMPLE",
        input: tc.input || " ",
        output: tc.output || " ",
      })),
      ...(testCases.hiddenCases || []).map((tc) => ({
        ...tc,
        type: "HIDDEN",
        input: tc.input || " ",
        output: tc.output || " ",
      })),
    ];

    const submission = await submissionModel.create({
      problem: problemId,
      contest: contestId || null,
      user: userId,
      code,
      language,
      status: "RUNNING",
    });

    const testResults = [];
    let allPassed = true;
    let totalExecutionTime = 0;
    let maxMemoryUsed = 0;
    let errorMessage = "";

    for (const tc of allTestCases) {
      const testInput = tc.input || " ";
      const testOutput = tc.output || " ";

      const result = await executeCode(language, code, testInput);

      if (!result.success) {
        allPassed = false;
        errorMessage = result.error || "Execution failed";
        testResults.push({
          testCaseType: tc.type,
          status: "ERROR",
          input: testInput,
          expectedOutput: testOutput,
          actualOutput: result.output || "",
          executionTime: 0,
          memoryUsed: 0,
          errorMessage: result.error || "Execution failed",
        });
        break;
      }

      const passed = (result.output || "").trim() === (testOutput || "").trim();

      testResults.push({
        testCaseType: tc.type,
        status: passed ? "PASSED" : "FAILED",
        input: testInput,
        expectedOutput: testOutput,
        actualOutput: result.output,
        executionTime: result.executionTime || 0,
        memoryUsed: result.memoryUsed || 0,
        errorMessage: "",
      });

      totalExecutionTime += result.executionTime || 0;
      maxMemoryUsed = Math.max(maxMemoryUsed, result.memoryUsed || 0);

      if (!passed) {
        allPassed = false;
      }
    }

    let finalStatus = "ACCEPTED";
    if (!allPassed) {
      const hasError = testResults.some((tr) => tr.status === "ERROR");

      if (hasError) {
        finalStatus = "RUNTIME_ERROR";
      } else {
        finalStatus = "WRONG_ANSWER";
      }
    }

    const isCorrect = allPassed;

    submission.status = finalStatus;
    submission.isCorrect = isCorrect;
    submission.executionTime = totalExecutionTime;
    submission.memoryUsed = maxMemoryUsed;
    submission.testResults = testResults;
    submission.errorMessage = errorMessage;

    await submission.save();

    if (isCorrect) {
      await userProgressController.addSolvedProblem(userId, problemId, {
        submissionId: submission._id,
        language: language,
      });

      problem.solvedCount += 1;

      await problem.save();
    } else {
      await userProgressController.addAttemptedProblem(userId, problemId, {
        submissionId: submission._id,
        status: finalStatus,
      });
    }

    if (isContestSubmission && isContestOngoing && isCorrect) {
      const contestProblem = contest.problems.find(
        (p) => p.problem.toString() === problemId,
      );

      const participant = contest.participants.find(
        (p) => p.user.toString() === userId.toString(),
      );

      if (participant) {
        const problemOrder = contestProblem ? contestProblem.order : -1;

        const points = contestProblem
          ? contestProblem.points || problemOrder * 10
          : 100;

        if (!participant.solved.includes(problemOrder)) {
          participant.solved.push(problemOrder);
          participant.score += points;
          await contest.save();
        }
      }

      const existingContest =
        await userProgressController.addParticipatedContest(userId, contestId);
    }

    if (isContestSubmission && isContestOngoing && !isCorrect) {
      const participant = contest.participants.find(
        (p) => p.user.toString() === userId.toString(),
      );

      if (participant) {
        participant.score = Math.max(0, participant.score - 3);
        participant.wrongAttempts = (participant.wrongAttempts || 0) + 1;
        await contest.save();

      }
    }

    const response = submission.toObject();

    const sampleResults = response.testResults.filter(
      (tr) => tr.testCaseType === "SAMPLE",
    );

    const passedSamples = sampleResults.filter(
      (tr) => tr.status === "PASSED",
    ).length;

    const totalSamples = sampleResults.length;

    let failedTestCase = null;

    if (!isCorrect) {
      const firstFailed = response.testResults.find(
        (tr) => tr.status === "FAILED" || tr.status === "ERROR",
      );
      if (firstFailed) {
        failedTestCase = {
          input: firstFailed.input,
          expectedOutput: firstFailed.expectedOutput,
          actualOutput: firstFailed.actualOutput,
          errorMessage: firstFailed.errorMessage,
        };
      }
    }

    return res.status(201).json({
      success: true,
      message: "Submission processed successfully",
      data: {
        submission: {
          id: response._id,
          status: response.status,
          isCorrect: response.isCorrect,
          executionTime: response.executionTime,
          memoryUsed: response.memoryUsed,
          testResults: sampleResults,
          passedSamples,
          totalSamples,
          failedTestCase,
          errorMessage: response.errorMessage,
          submittedAt: response.submittedAt,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process submission",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get all submissions for a user
 * @route GET /api/submissions/user
 * @access Private
 */
const getUserSubmissions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { problemId, contestId, status, page = 1, limit = 10 } = req.query;

    const filter = { user: userId };
    if (problemId) filter.problem = problemId;
    if (contestId) filter.contest = contestId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await submissionModel
      .find(filter)
      .populate("problem", "title difficulty")
      .populate("contest", "name status")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await submissionModel.countDocuments(filter);

    // Remove full test results for listing
    const sanitizedSubmissions = submissions.map((s) => {
      const sub = s.toObject();
      if (sub.testResults) {
        sub.testResults = sub.testResults.filter(
          (tr) => tr.testCaseType === "SAMPLE",
        );
      }
      return sub;
    });

    return res.status(200).json({
      success: true,
      data: {
        submissions: sanitizedSubmissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user submissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
    });
  }
};

/**
 * Get a single submission by ID
 * @route GET /api/submissions/:id
 * @access Private
 */
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID",
      });
    }

    const submission = await submissionModel
      .findById(id)
      .populate("problem", "title difficulty description")
      .populate("contest", "name status")
      .populate("user", "username name");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Check if user owns this submission
    if (submission.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this submission",
      });
    }

    // Only show sample test results
    const response = submission.toObject();
    if (response.testResults) {
      response.testResults = response.testResults.filter(
        (tr) => tr.testCaseType === "SAMPLE",
      );
    }

    return res.status(200).json({
      success: true,
      data: { submission: response },
    });
  } catch (error) {
    console.error("Get submission by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission",
    });
  }
};

/**
 * Get submissions for a specific problem (admin only)
 * @route GET /api/submissions/problem/:problemId
 * @access Private (Admin/Problem owner)
 */
const getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
    }

    // Check if user owns the problem's contest
    const problem = await problemModel.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    const contest = await contestModel.findById(problem.contest);
    if (contest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view these submissions",
      });
    }

    const filter = { problem: problemId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await submissionModel
      .find(filter)
      .populate("user", "username name email")
      .populate("contest", "name")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await submissionModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get problem submissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
    });
  }
};

/**
 * Get contest submissions (for leaderboard)
 * @route GET /api/submissions/contest/:contestId
 * @access Private
 */
const getContestSubmissions = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest ID",
      });
    }

    // Check if user is registered for contest
    const contest = await contestModel.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    const isRegistered = contest.participants.some(
      (p) => p.user.toString() === userId.toString(),
    );

    if (!isRegistered) {
      return res.status(403).json({
        success: false,
        message: "You are not registered for this contest",
      });
    }

    const submissions = await submissionModel
      .find({
        contest: contestId,
        user: userId,
      })
      .populate("problem", "title difficulty")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        submissions,
      },
    });
  } catch (error) {
    console.error("Get contest submissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contest submissions",
    });
  }
};

module.exports = {
  createSubmission,
  getUserSubmissions,
  getSubmissionById,
  getProblemSubmissions,
  getContestSubmissions,
};