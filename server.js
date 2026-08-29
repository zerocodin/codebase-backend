const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB();

const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//     console.log(`server is running on port ${PORT}`);
//       console.log(`Accessible on LAN at http://192.168.2.166:${PORT}`);
// });

app.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
});