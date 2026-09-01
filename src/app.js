const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRouter = require("./routes/auth.routes");
const otpRouter = require("./routes/otp.routes");
const userRouter = require("./routes/user.routes");
const contestRouter = require("./routes/contest.routes");
const problemRouter = require("./routes/problem.routes");
const executeRouter = require("./routes/execute.routes");
const submissionRouter = require("./routes/submission.routes");
const userProgressRouter = require("./routes/userProgress.routes");
const userLeaderboard = require('./routes/leaderboard.routes')
const statsRouter = require("./routes/stats.routes");

const commentRouter = require('./routes/comment.routes')
const challengeRouter = require('./routes/challenge.routes')

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

const allowedOrigins = [
  // "http://localhost:5173"
  process.env.FRONTEND,
  "https://codebase-frontend-live.vercel.app/",
  "https://codebase-frontend-live-git-main-zero-a611.vercel.app/",
  "https://codebase-frontend-live-mp4c1li0w-zero-a611.vercel.app/"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);


// demo testing
app.get("/", (req, res) => {
  res.end("hello from server");
});

// user auth api
app.use("/api/auth", authRouter);

// opt verification api
app.use("/api/otp", otpRouter);

// user update information
app.use("/api/user", userRouter);

// contest api
app.use("/api/contest", contestRouter);

// problem api
app.use("/api/problem", problemRouter);

// submission api
app.use("/api/submission", submissionRouter); 

// execute code api
app.use("/api/execute", executeRouter);

// user progress api
app.use("/api/user-progress", userProgressRouter);

// contest leaderboard
app.use("/api/leaderboard", userLeaderboard);

// profile statistic
app.use("/api/stats", statsRouter);

// challenge api
app.use("/api/challenges", challengeRouter);

// challenge-comment api
app.use("/api/comments", commentRouter);

module.exports = app;
