const jwt = require("jsonwebtoken");

const userModel = require("../models/user.model");

async function authMiddleware(req, res, next) {

  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized accessa",
        success: false,
      });
    }

    if (user.emailStatus === "REJECTED") {
      return res.status(403).json({
        message: "Account has been banned",
        success: false,
      });
    }

      if (user.emailStatus === "INREVIEW" || user.isVerified == false) {
        return res.status(401).json({
          message: "verify your account first or wait for review.",
          success: false,
        });
      }

    req.user = user;

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again.",
        success: false,
      });
    }

    return res.status(401).json({
      message: "Unauthorized access",
      success: false,
    });
  }
}

module.exports = authMiddleware;