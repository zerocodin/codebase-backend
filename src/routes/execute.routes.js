const express = require("express");

const router = express.Router();

const executeController = require('../controllers/execute.controller')

router.post("/", executeController.execute);

router.get("/languages", executeController.language);

module.exports = router;