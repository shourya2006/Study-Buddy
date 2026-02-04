const axios = require("axios");
const { ensureToken } = require("./newtonToken");
const ProcessedLecture = require("../models/ProcessedLecture.model");
require("dotenv").config();

const NEWTON_BASE_URL = "https://my.newtonschool.co/api/v1/course/h";
const CLIENT_ID = process.env.NEWTON_CLIENT_ID;
const CLIENT_SECRET = process.env.NEWTON_CLIENT_SECRET;

async function fetchLecturesForCourse(courseSlug) {
  const token = await ensureToken();
  if (!token) {
    throw new Error("Failed to get Newton token");
  }

  const response = await axios.get(
    `${NEWTON_BASE_URL}/${courseSlug}/lecture/all/?past=true&limit=500&offset=0`,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "client-id": CLIENT_ID,
        "client-secret": CLIENT_SECRET,
      },
    },
  );

  return response.data.results || [];
}

async function filterLecturesWithPDF(lectures) {
  return lectures.filter(
    (lecture) => lecture.whiteboard_file && lecture.whiteboard_file !== null,
  );
}

async function getUnprocessedLectures(lectures) {
  const processedHashes = await ProcessedLecture.find({}).select("hash").lean();
  const processedSet = new Set(processedHashes.map((p) => p.hash));

  return lectures.filter((lecture) => !processedSet.has(lecture.hash));
}

async function markLectureAsProcessed(lecture, vectorCount, subjectId) {
  await ProcessedLecture.findOneAndUpdate(
    { hash: lecture.hash },
    {
      hash: lecture.hash,
      title: lecture.title,
      courseSlug: lecture.course?.hash || "unknown",
      courseName: lecture.course?.short_display_name || "Unknown",
      subjectId: subjectId,
      whiteboardUrl: lecture.whiteboard_file,
      vectorCount: vectorCount,
      processedAt: new Date(),
    },
    { upsert: true, new: true },
  );
}

async function getSyncStatus() {
  const total = await ProcessedLecture.countDocuments();
  const recent = await ProcessedLecture.find({})
    .sort({ processedAt: -1 })
    .limit(5)
    .lean();

  return { totalProcessed: total, recentLectures: recent };
}

module.exports = {
  fetchLecturesForCourse,
  filterLecturesWithPDF,
  getUnprocessedLectures,
  markLectureAsProcessed,
  getSyncStatus,
};
