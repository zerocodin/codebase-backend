const userModel = require("../models/user.model");
const sendMAIL = require("../utils/mail");
const getToken = require("../utils/token");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// can be use for both send and resend otp. same procedure
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "email is required",
        success: false,
      });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User doesn't exists!",
        success: false,
      });
    }

    if (user.emailStatus == "REJECTED") {
      return res.status(400).json({
        message: "This account is banned",
        success: false,
      });
    }

    const otp = generateOTP();

    user.OTP = otp;
    user.OTPexprires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await user.save();

    sendMAIL({ to: email, otp }); // can be sent as async

    return res.status(200).json({
      message: "OTP has been sent to you email.",
      success: true,
    });
  } catch (error) {
    console.error("OTP sending error : ", error);

    return res.status(500).json({
      message: "Failed to send OTP. Place try again",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, OTP } = req.body;

    if (!email || !OTP) {
      return res.status(400).json({
        message: "Please entry required data",
        success: false,
      });
    }

    const user = await userModel.findOne({ email }).select("+OTP +OTPexprires");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.emailStatus === "REJECTED") {
      return res.status(400).json({
        message: "This account is banned",
        success: false,
      });
    }

    if (user.OTPexprires < Date.now() || String(user.OTP) !== String(OTP)) {
      return res.status(400).json({
        message: "Invalid OTP or expired OTP",
        success: false,
      });
    }

    const token = getToken.getAccessToken({
      id: user._id,
      email: user.email,
      username: user.username,
    });

    user.accessToken = token;
    user.isVerified = true;
    user.OTP = null;
    user.OTPexprires = null;

    if (user.emailStatus == "VERIFIED") user.emailStatus = "RUNNING";
    else user.emailStatus = "VERIFIED";

    await user.save();

    return res.status(200).json({
      message: "OTP verifed successfully.",
      success: true,
    });
  } catch (error) {
    console.error("OTP verification failed : ", error);

    return res.status(500).json({
      message: "Failed to verify OTP. Try again later",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


const sendOTP1 = async (req, res) => {
  try {
    const { email , newEmail} = req.body;

    if (!email) {
      return res.status(400).json({
        message: "email is required",
        success: false,
      });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User doesn't exists!",
        success: false,
      });
    }

    if (user.emailStatus == "REJECTED") {
      return res.status(400).json({
        message: "This account is banned",
        success: false,
      });
    }

    const otp = generateOTP();

    user.OTP = otp;
    user.OTPexprires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await user.save();

    sendMAIL({ to: newEmail, otp }); // can be sent as async

    return res.status(200).json({
      message: "OTP has been sent to you new email.",
      success: true,
    });
  } catch (error) {
    console.error("OTP sending error : ", error);

    return res.status(500).json({
      message: "Failed to send OTP. Place try again",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  sendOTP1
};
