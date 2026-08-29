const express = require("express");

const userController = require("../controllers/user.controller");
const uploadMiddleware = require("../middlewares/upload.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// public
router.get("/get-user/:id", userController.getUserById);
router.get("/search", userController.searchUsers);

// private
router.put(
  "/profile-image",
  authMiddleware,
  uploadMiddleware.uploadSingleImage,
  userController.imageUpdate,
);
router.post("/check-email", authMiddleware, userController.emailCheck);
router.put("/update-email", authMiddleware, userController.updateEmail);
router.put("/change-password", authMiddleware, userController.changePassword);
router.put("/profile-update", authMiddleware, userController.profieUpdate);
router.delete("/delete-account", authMiddleware, userController.deleteAccount);
router.get("/get-profile", authMiddleware, userController.getProfile);

module.exports = router;