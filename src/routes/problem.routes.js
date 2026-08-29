const express = require("express");
const problemController = require("../controllers/problem.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Public routes
router.get("/get-problems", problemController.getAllProblems);
router.get("/problem/:id", problemController.getProblemById);

// Protected routes
router.post("/create", authMiddleware, problemController.createProblem); 
router.put("/update/:id", authMiddleware, problemController.updateProblem);
router.delete("/delete/:id", authMiddleware, problemController.deleteProblem);

module.exports = router;