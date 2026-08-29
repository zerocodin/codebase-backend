const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  sampleCases: {
    type: [
      {
        input: {
          type: String,
          // required: [true, "Sample input is required"],
          default: " ",
        },
        output: {
          type: String,
          required: [true, "Sample output is required"],
          default: " ",
        },
        explanation: {
          type: String,
          trim: true,
        },
      },
    ],
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: "At least one sample test case is required",
    },
  },
  hiddenCases: {
    type: [
      {
        input: {
          type: String,
          // required: true,
          default: " ",
        },
        output: {
          type: String,
          required: true,
          default: " ",
        },
      },
    ],
    select: false,
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "problem",
  },
});

testCaseSchema.index({ problem: 1 });

const testCaseModel = mongoose.model("testCase", testCaseSchema);

module.exports = testCaseModel;