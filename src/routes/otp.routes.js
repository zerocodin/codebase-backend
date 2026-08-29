const express = require("express");
const otpController = require('../controllers/otp.controller')

const router = express.Router();

// can be use for both send and resend otp. same procedure
router.post("/sendOTP", otpController.sendOTP);
router.post("/sendOTP1", otpController.sendOTP1);
router.post('/verifyOTP', otpController.verifyOTP)

module.exports = router;
