const mongoose = require('mongoose')
const bcrypt = require("bcryptjs");

const userModel = require("../models/user.model");
const imagekit = require("../services/imagekit.service");

const imageUpdate = async (req, res) => {
  try {
    const userId = req.user._id;

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    // Generate unique filename
    const fileName = `profile-${userId}-${Date.now()}`;

    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: fileName,
      folder: "/profile-images",
      tags: ["profile", "user"],
    });

    const user = await userModel
      .findByIdAndUpdate(
        userId,
        { profileImage: uploadResponse.url },
      // { new: true },
        {returnDocument:'after'}
      )

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        profileImage: user.profileImage,
        user: user,
      },
    });
  } catch (error) {
    console.error("Update profile image error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile image",
    });
  }
};

// match previous email
const emailCheck = async (req, res) => {
  try {
    const { email, password } = req.body || req.params;

    if (!email || !password) {
      return res.status(403).json({
        message: "Fill all required data.",
        success: false,
      });
    }

    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "email and password didn't matched",
        success: false,
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(404).json({
        message: "email and password didn't matched",
        success: false,
      });
    }

    return res.status(200).json({
      message: "verify email now",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetched data",
      success: false,
    });
  }
};

// change email
const updateEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(403).json({
        message: "Fill all required data.",
        success: false,
      });
    }

    const user1 = await userModel.findOne({ email: newEmail });

    if (user1) {
      return res.status(404).json({
        message: "email is used by other user",
        success: false,
      });
    }

    const userId = req.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(403).json({
        message: "unauthorized access",
        success: false,
      });
    }

    user.email = newEmail;

    await user.save();

    return res.status(200).json({
      message: "email changed successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update email",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;

    const userId = req.user._id;

    if (!newPassword || !password) {
      return res.status(403).json({
        message: "Fill all required data.",
        success: false,
      });
    }

    const user = await userModel.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "unauthorized access",
        success: false,
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(404).json({
        message: "current password didn't matched",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      message: "password changed",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update new password",
    });
  }
};

const profieUpdate = async (req, res) => {
  try {
    const { name, bio, age } = req.body;
    const userId = req.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (age) user.age = age;

    await user.save()

    return res.status(200).json({
      message: "profie updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "profile updated incompleted",
      success: false,
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user._id;
    if (!email || !password) {
      return res.status(403).json({
        message: "must need email and password!",
        success: false,
      });
    }

    const user = await userModel.findById(userId).select("+password");

    if (!user || user.email !== email) {
      return res.status(404).json({
        message: "Invalid email or password",
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(404).json({
        message: "Invalid email or password",
      });
    }

    await userModel.findByIdAndDelete(userId);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
    });

    return res.status(200).json({
      message: "Account deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete account",
      success: false,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId)

    if (!user) {
      return res.status(403).json({
        message: 'Unauthorized access. Login first',
        success:false,
      })
    }

    if (user.emailStatus === 'REJECTED') {
      return res.status(401).json({
        message: 'Your account is banned',
        success:false
      })
    }

    if (user.emailStatus === 'INREVIEW') {
      return res.status(401).json({
        message: 'Verify your email first',
        success:false,
      })
    }

    return res.status(200).json({
      message: 'Account data fetched successfully',
      user,
      success: true,
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get user data",
      success: false,
    });
  }
}

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await userModel
      .findById(id)
      .select(
        "name username bio age profileImage emailStatus isVerified createdAt",
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = user.toObject();
    delete userData.email;

    return res.status(200).json({
      success: true,
      data: {
        user: userData,
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const users = await userModel
      .find({
        username: { $regex: username.trim(), $options: "i" },
      })
      .select("_id username name profileImage bio")
      .limit(5);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  emailCheck,
  updateEmail,
  changePassword,
  imageUpdate,
  profieUpdate,
  deleteAccount,
  getProfile,
  getUserById,
  searchUsers,
};