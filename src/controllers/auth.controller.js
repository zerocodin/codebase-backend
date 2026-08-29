const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userModel = require("../models/user.model");
const getToken = require("../utils/token");

const userRegister = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const isEmailExists = await userModel.findOne({ email });

    if (isEmailExists) {
      return res.status(400).json({
        message: "user already exists",
      });
    }

    const isUsernameExists = await userModel.findOne({ username });

    if (isUsernameExists) {
      return res.status(400).json({
        message: "choose a different username",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    return res.status(201).json({
      message: "Verify your email with OTP",
    });
  } catch (error) {
    console.error("Registration error : ", error);

    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Fill the required data",
        success: false,
      });
    }

    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "email or password didn't matched",
        success: false,
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        success: false,
      });
    }

    if (user.emailStatus === "REJECTED") {
      return res.status(403).json({
        message: "This account has been banned",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(403).json({
        message: "email or password didn't matched",
        success: false,
      });
    }

    const accessToken = getToken.getAccessToken({
      id: user._id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = getToken.getUserToken(user._id);

    user.accessToken = accessToken;
    user.emailStatus = "RUNNING";
    user.lastLogin = new Date();

    await user.save();
    
    return res
      .cookie("token", refreshToken, {
        secure: process.env.NODE_ENV === "production",//false
        sameSite: process.env.NODE_ENV === "production"? "none":"lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d token
        httpOnly: true,
      })
      .status(200)
      .json({
        message: "account logged in successfully",
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
          bio: user.bio,
          emailStatus: user.emailStatus,
          isVerified: user.isVerified,
        },
      });
  } catch (error) {
    console.error("login error : ", error);

    return res.status(500).json({
      message: "Can't logged in now, try again.",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const userLogout = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(403).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    user.emailStatus = "VERIFIED";

    await user.save();

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Can't logged out, try again.",
      success: false,
    });
  }
};

const deleteUnverified = async (req, res) => {
  try {
    const email = req.query.email || req.body.email;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    if (!userModel) {
      console.error("userModel is not loaded!");
      return res.status(500).json({
        message: "Database model error",
        success: false,
      });
    }

    const user = await userModel.findOne({ email });

    console.log("User found:", user ? user.email : "Not found");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.isVerified === true) {
      return res.status(400).json({
        message: "User is already verified. Cannot delete.",
        success: false,
      });
    }

    const deletedUser = await userModel.findOneAndDelete({ _id: user._id });

    if (!deletedUser) {
      return res.status(500).json({
        message: "Failed to delete user",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Unverified user deleted successfully",
      success: true,
      data: {
        id: deletedUser._id,
        email: deletedUser.email,
        username: deletedUser.username,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(403).json({
        message: "enter required data",
        success: false,
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
        success: false,
      });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Register first",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = getToken.getAccessToken({
      id: user._id,
      email: user.email,
      username: user.username,
    });

    user.accessToken = token;
    user.isVerified = true;
    user.OTP = null;
    user.OTPexprires = null;
    user.password = hashedPassword;
    user.emailStatus = "VERIFIED";

    await user.save();

    return res.status(200).json({
      message: "Password changed successfully.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Password couldn't changed! Try again",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
module.exports = {
  userRegister,
  userLogin,
  userLogout,
  deleteUnverified,
  resetPassword,
};
