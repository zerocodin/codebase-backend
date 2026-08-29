const express = require("express");

const contestController = require("../controllers/contest.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// public api
router.get("/upcoming", contestController.getUpcomingContests);
router.get("/ongoing", contestController.getOngoingContests);
router.get("/completed", contestController.getCompletedContests);
router.get("/get-contest/:id", contestController.getContestById);
router.get("/:id/participants", contestController.getContestParticipants);
router.get("/:id/stats", contestController.getContestStats);

// protected api
router.post("/create", authMiddleware, contestController.createContest);
router.put("/update/:id", authMiddleware, contestController.updateContest);

router.get(
  "/get-contest-user/:id",
  authMiddleware,
  contestController.getContestByUserId,
);

router.post(
  "/:id/register",
  authMiddleware,
  contestController.registerForContest,
);
router.delete(
  "/:id/unregister",
  authMiddleware,
  contestController.unregisterFromContest,
);

router.delete("/delete/:id", authMiddleware, contestController.deleteContest);

module.exports = router;
