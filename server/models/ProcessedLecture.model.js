const mongoose = require("mongoose");

const ProcessedLectureSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  courseSlug: {
    type: String,
    required: true,
    index: true,
  },
  courseName: String,
  subjectId: {
    type: String,
    index: true,
  },
  whiteboardUrl: String,
  vectorCount: {
    type: Number,
    default: 0,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ProcessedLecture", ProcessedLectureSchema);
