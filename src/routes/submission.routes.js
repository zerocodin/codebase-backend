const express = require("express");
const submissionController = require("../controllers/submission.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, submissionController.createSubmission);
router.get("/user", authMiddleware, submissionController.getUserSubmissions);
router.get("/:id", authMiddleware, submissionController.getSubmissionById);
router.get(
  "/problem/:problemId",
  authMiddleware,
  submissionController.getProblemSubmissions,
);
router.get(
  "/contest/:contestId",
  authMiddleware,
  submissionController.getContestSubmissions,
);

module.exports = router;