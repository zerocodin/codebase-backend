const jwt = require("jsonwebtoken");

const getUserToken = (userId) => {
  try {
    const token = jwt.sign(
      { userId: userId.toString() },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    return token;
  } catch (error) {
    console.error("Can't generate user token:", error);
    return null;
  }
};

const getAccessToken = ({ id, email, username }) => {
  try {
    const token = jwt.sign(
      {
        id,
        email,
        username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" },
    );

    return token;
  } catch (error) {
    console.error("can't generate token", error);
    return null;
  }
};

module.exports = {
  getAccessToken,
  getUserToken,
};
