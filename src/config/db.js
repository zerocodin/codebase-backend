const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((conn) => {
      console.log("mongodb connected successfully");
    })
    .catch((err) => {
      console.error("Database connection problem : ", err.message);
      process.exit(1);
    });
};

module.exports = connectDB;
