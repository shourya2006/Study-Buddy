const mongoose = require("mongoose");

const VideoRecommendationSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: true,
    index: true,
  },
  topicTitle: {
    type: String,
    required: true,
  },
  courseName: {
    type: String,
    default: "",
  },
  recommendations: [
    {
      videoId: String,
      title: String,
      description: String,
      channelTitle: String,
      thumbnail: String,
      url: String,
      similarityScore: Number,
      subtopicsUsed: [String],
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

VideoRecommendationSchema.index(
  { subjectId: 1, topicTitle: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "VideoRecommendation",
  VideoRecommendationSchema,
);
