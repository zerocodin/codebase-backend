const mongoose = require("mongoose");

const problemModel = require("../models/problem.model");
const contestModel = require("../models/contest.model");
const testCaseModel = require("../models/testCase.model");

const createProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      tags,
      inputFormat,
      outputFormat,
      constraints,
      sampleCases,
      hiddenCases,
      contestId,
    } = req.body;

    if (
      !title ||
      !description ||
      !inputFormat ||
      !outputFormat ||
      !constraints ||
      !contestId
    ) {
      return res.status(400).json({
        message:
          "All required fields: title, description, inputFormat, outputFormat, constraints, contestId",
        success: false,
      });
    }

    if (
      !sampleCases ||
      !Array.isArray(sampleCases) ||
      sampleCases.length === 0
    ) {
      return res.status(400).json({
        message: "At least one sample test case is required",
        success: false,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        message: "Invalid contest ID",
        success: false,
      });
    }

    const contest = await contestModel.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        message: "Contest not found",
        success: false,
      });
    }

    if (contest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to add problems to this contest",
        success: false,
      });
    }

    if (contest.status === "COMPLETED") {
      return res.status(400).json({
        message: `Cannot add problems to a contest that is ${contest.status.toLowerCase()}`,
        success: false,
      });
    }

    const existingProblem = await problemModel.findOne({
      title: title,
      contest: contestId,
    });
    if (existingProblem) {
      return res.status(400).json({
        message: "A problem with this title already exists in the contest",
        success: false,
      });
    }

    const testCase = await testCaseModel.create({
      sampleCases: sampleCases.map((sc) => ({
        input: sc.input,
        output: sc.output,
        explanation: sc.explanation || "",
      })),
      hiddenCases:
        hiddenCases && Array.isArray(hiddenCases)
          ? hiddenCases.map((hc) => ({
              input: hc.input,
              output: hc.output,
            }))
          : [],
    });

    const problem = await problemModel.create({
      title,
      description,
      difficulty: difficulty || "MEDIUM",
      problemStatus: "UPCOMING",
      tags: tags || [],
      inputFormat,
      outputFormat,
      constraints,
      testCase: testCase._id,
      contest: contestId,
    });

    testCase.problem = problem._id;
    await testCase.save();

    contest.problems.push({
      problem: problem._id,
      order: contest.problems.length + 1,
    });
    await contest.save();

    const createdProblem = await problemModel
      .findById(problem._id)
      .populate("testCase")
      .populate("contest", "name status");

    const response = createdProblem.toObject();
    if (response.testCase) {
      response.testCase.hiddenCases = undefined;
    }

    return res.status(201).json({
      message: "Problem created successfully",
      success: true,
      data: {
        problem: response,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Problem with this title already exists",
        success: false,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create problem",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAllProblems = async (req, res) => {
  try {
    const {
      difficulty,
      tags,
      contestId,
      search,
      page = 1,
      limit = 30,
      sortBy,
      sortOrder,
    } = req.query;

    const filter = {};
    filter.problemStatus = "COMPLETED";
    if (difficulty) filter.difficulty = difficulty;
    if (contestId) filter.contest = contestId;
    if (tags) filter.tags = { $in: tags.split(",") };
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOptions = { createdAt: -1 };

    if (sortBy) {
      const sortFieldMap = {
        title: "title",
        difficulty: "difficulty",
        rating: "rating",
        solvedCount: "solvedCount",
        createdAt: "createdAt",
      };

      const dbField = sortFieldMap[sortBy] || "createdAt";
      const sortValue = sortOrder === "asc" ? 1 : -1;
      sortOptions = { [dbField]: sortValue };
    }

    if (search) {
      sortOptions = { score: { $meta: "textScore" } };
    }

    const problems = await problemModel
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const sanitizedProblems = problems.map((p) => {
      const problem = p.toObject();
      if (problem.testCase) {
        problem.testCase.hiddenCases = undefined;
      }
      return problem;
    });

    const total = await problemModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        problems: sanitizedProblems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all problems error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problems",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
    }

    const problem = await problemModel
      .findById(id)
      .select("title description inputFormat outputFormat constraints")
      .populate("testCase", "sampleCases")
      .lean();

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        problem: {
          title: problem.title,
          id:problem._id, // can be remove later
          description: problem.description,
          inputFormat: problem.inputFormat,
          outputFormat: problem.outputFormat,
          constraints: problem.constraints,
          sampleCases: problem.testCase?.sampleCases || [],
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problem",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
    }

    const problem = await problemModel.findById(id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    const contest = await contestModel.findById(problem.contest);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    if (contest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this problem",
      });
    }

    if (contest.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: `Cannot delete problem from a contest that is ${contest.status.toLowerCase()}`,
      });
    }

    contest.problems = contest.problems.filter(
      (p) => p.problem.toString() !== id,
    );
    await contest.save();

    await testCaseModel.findByIdAndDelete(problem.testCase);

    await problemModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Problem deleted successfully",
    });
  } catch (error) {
    console.error("Delete problem error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete problem",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      difficulty,
      tags,
      inputFormat,
      outputFormat,
      constraints,
      sampleCases,
      hiddenCases,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
    }

    const problem = await problemModel.findById(id);
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
        message: "You are not authorized to update this problem",
      });
    }

    if (contest.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: `Cannot update problem in a contest that is ${contest.status.toLowerCase()}`,
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (difficulty) updateData.difficulty = difficulty;
    if (tags) updateData.tags = tags;
    if (inputFormat) updateData.inputFormat = inputFormat;
    if (outputFormat) updateData.outputFormat = outputFormat;
    if (constraints) updateData.constraints = constraints;

    const updatedProblem = await problemModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("contest", "name status")
      .populate("testCase");

    if (sampleCases || hiddenCases) {
      const testCase = await testCaseModel.findById(problem.testCase);

      if (sampleCases && Array.isArray(sampleCases) && sampleCases.length > 0) {
        testCase.sampleCases = sampleCases.map((sc) => ({
          input: sc.input,
          output: sc.output,
          explanation: sc.explanation || "",
        }));
      }

      if (hiddenCases && Array.isArray(hiddenCases)) {
        testCase.hiddenCases = hiddenCases.map((hc) => ({
          input: hc.input,
          output: hc.output,
        }));
      }

      await testCase.save();
    }

    const response = updatedProblem.toObject();
    if (response.testCase) {
      response.testCase.hiddenCases = undefined;
    }

    return res.status(200).json({
      success: true,
      message: "Problem updated successfully",
      data: { problem: response },
    });
  } catch (error) {
    console.error("Update problem error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update problem",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createProblem,
  getAllProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
};
