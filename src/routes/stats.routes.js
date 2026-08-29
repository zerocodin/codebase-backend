const express = require("express");
const statsController = require("../controllers/stats.controller");

const router = express.Router();

// Public routes
router.get("/", statsController.getPlatformStats);

module.exports = router;