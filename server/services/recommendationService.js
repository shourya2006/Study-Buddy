const axios = require("axios");

const RECOMMENDATION_SERVICE_URL =
  process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:5002";

async function getRecommendationsForSubject(subjectId, topK = 3) {
  const response = await axios.post(
    `${RECOMMENDATION_SERVICE_URL}/recommend`,
    { subjectId, topK },
    { timeout: 30000 },
  );
  return response.data;
}

async function getRecommendationsForTopic(topic, courseName = "", topK = 5) {
  const response = await axios.post(
    `${RECOMMENDATION_SERVICE_URL}/recommend`,
    { topic, courseName, topK },
    { timeout: 15000 },
  );
  return response.data;
}

module.exports = {
  getRecommendationsForSubject,
  getRecommendationsForTopic,
};
