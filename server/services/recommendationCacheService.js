const VideoRecommendation = require("../models/VideoRecommendation.model");
const ProcessedLecture = require("../models/ProcessedLecture.model");
const axios = require("axios");

const RECOMMENDATION_SERVICE_URL =
  process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:5002";

async function getRecommendationsForSubject(subjectId) {
  const cached = await VideoRecommendation.find({ subjectId })
    .sort({ topicTitle: 1 })
    .lean();

  if (cached.length > 0) {
    console.log(
      `[RecommendationCache] Returning ${cached.length} cached recommendations for ${subjectId}`,
    );
    return cached.map((r) => ({
      topicTitle: r.topicTitle,
      courseName: r.courseName,
      recommendations: r.recommendations,
      lastUpdated: r.lastUpdated,
    }));
  }

  console.log(
    `[RecommendationCache] No cache for ${subjectId}, fetching from recommender...`,
  );
  return await refreshRecommendationsForSubject(subjectId);
}

async function refreshRecommendationsForSubject(subjectId) {
  const lectures = await ProcessedLecture.find({ subjectId })
    .select("title courseName")
    .lean();

  const topics = lectures.filter(
    (l) => !l.title.includes("Course and Instructor Introduction"),
  );

  if (topics.length === 0) {
    console.log(`[RecommendationCache] No topics found for ${subjectId}`);
    return [];
  }

  const cachedTitles = new Set(
    (
      await VideoRecommendation.find({ subjectId }).select("topicTitle").lean()
    ).map((r) => r.topicTitle),
  );

  const uncachedTopics = topics.filter((t) => !cachedTitles.has(t.title));

  if (uncachedTopics.length === 0) {
    console.log(
      `[RecommendationCache] All topics already cached for ${subjectId}`,
    );
    const cached = await VideoRecommendation.find({ subjectId }).lean();
    return cached.map((r) => ({
      topicTitle: r.topicTitle,
      courseName: r.courseName,
      recommendations: r.recommendations,
      lastUpdated: r.lastUpdated,
    }));
  }

  console.log(
    `[RecommendationCache] Fetching recommendations for ${uncachedTopics.length} uncached topics...`,
  );

  const results = [];

  for (const topic of uncachedTopics) {
    try {
      const response = await axios.post(
        `${RECOMMENDATION_SERVICE_URL}/recommend`,
        {
          topic: topic.title,
          courseName: topic.courseName || "",
          subjectId: subjectId,
          topK: 1,
        },
        { timeout: 30000 },
      );

      const recs = response.data.recommendations || [];

      await VideoRecommendation.findOneAndUpdate(
        { subjectId, topicTitle: topic.title },
        {
          subjectId,
          topicTitle: topic.title,
          courseName: topic.courseName || "",
          recommendations: recs,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      );

      results.push({
        topicTitle: topic.title,
        courseName: topic.courseName || "",
        recommendations: recs,
        lastUpdated: new Date(),
      });

      console.log(
        `[RecommendationCache] Cached ${recs.length} videos for '${topic.title}'`,
      );
    } catch (error) {
      let errorMsg = error.message;
      if (error.response) {
        errorMsg = `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMsg = "No response received (Python service might be down)";
      }
      console.error(
        `[RecommendationCache] Error for '${topic.title}': ${errorMsg}`,
      );

      results.push({
        topicTitle: topic.title,
        courseName: topic.courseName || "",
        recommendations: [],
        lastUpdated: new Date(),
      });
    }
  }

  const allCached = await VideoRecommendation.find({ subjectId }).lean();
  return allCached.map((r) => ({
    topicTitle: r.topicTitle,
    courseName: r.courseName,
    recommendations: r.recommendations,
    lastUpdated: r.lastUpdated,
  }));
}

async function refreshAllSubjects() {
  console.log("[Cron] Starting daily recommendation refresh...");

  const subjects = await ProcessedLecture.distinct("subjectId");

  for (const subjectId of subjects) {
    try {
      await refreshRecommendationsForSubject(subjectId);
    } catch (error) {
      console.error(`[Cron] Error refreshing ${subjectId}:`, error.message);
    }
  }

  console.log("[Cron] Daily recommendation refresh complete.");
}

module.exports = {
  getRecommendationsForSubject,
  refreshRecommendationsForSubject,
  refreshAllSubjects,
};
