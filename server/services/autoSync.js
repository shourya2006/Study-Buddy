const cron = require("node-cron");
const {
  fetchLecturesForCourse,
  filterLecturesWithPDF,
  getUnprocessedLectures,
  markLectureAsProcessed,
} = require("./lectureSync");
const { processPDF } = require("./pdfService");
const { generateEmbeddings } = require("./vectorService");
const { upsertVectors } = require("./pineconeService");

// Course slugs mapped to subject IDs for namespacing
const COURSES_BY_SUBJECT = {
  // SEM1
  math1: ["nzwmtdd1ktye"],
  psp: ["cw8jd8q33uv9"],
  snw: ["wrskwgrpxjgu"],
  // SEM2
  dsa: ["ah5qi2u9urrt"],
  wap: ["zqg6ta3917k0"],
  math2: ["x0n0l9p7wnzr"],
  // SEM3
  ada: ["71w36ui55vki", "5yr840e54q5a"],
  ap: ["9qlmemzzpt6b", "p0f65o4fjzji"],
  dbms: ["6addtk39hy8c", "ico8pvge0zhd"],
  math3: ["yai5rx2h6q6k", "c7134jweubad"],
  // SEM4
  dm: ["ok58b70d78xa"],
  dva: ["c6c54c31a81s"],
  genai: ["o781u1d61228"],
  sdse: ["f52au2c8qoqs"],
};

let isSyncing = false;

async function syncCourse(courseSlug, subjectId) {
  try {
    console.log(
      `[AutoSync] Syncing course: ${courseSlug} (subject: ${subjectId})`,
    );

    const allLectures = await fetchLecturesForCourse(courseSlug);
    const lecturesWithPDF = await filterLecturesWithPDF(allLectures);
    const unprocessedLectures = await getUnprocessedLectures(lecturesWithPDF);

    console.log(
      `[AutoSync] ${courseSlug}: ${unprocessedLectures.length} new lectures`,
    );

    for (const lecture of unprocessedLectures) {
      try {
        console.log(`[AutoSync] Processing: ${lecture.title}`);

        const chunks = await processPDF(lecture.whiteboard_file);
        if (chunks.length === 0) continue;

        const embeddings = await generateEmbeddings(chunks);
        const vectorCount = await upsertVectors(
          lecture.hash,
          chunks,
          embeddings,
          {
            title: lecture.title,
            course: lecture.course?.short_display_name || "Unknown",
          },
          subjectId,
        );

        await markLectureAsProcessed(lecture, vectorCount, subjectId);
        console.log(
          `[AutoSync] ✅ Done: ${lecture.title} -> namespace: ${subjectId}`,
        );
      } catch (error) {
        console.error(`[AutoSync] ❌ Failed: ${lecture.title}`, error.message);
      }
    }
  } catch (error) {
    console.error(`[AutoSync] Error syncing ${courseSlug}:`, error.message);
  }
}

async function syncAllCourses() {
  if (isSyncing) {
    console.log("[AutoSync] Already syncing, skipping...");
    return;
  }

  isSyncing = true;
  console.log("[AutoSync] 🔄 Starting full sync of all courses...");

  for (const [subjectId, slugs] of Object.entries(COURSES_BY_SUBJECT)) {
    for (const slug of slugs) {
      await syncCourse(slug, subjectId);
    }
  }

  console.log("[AutoSync] ✅ Full sync completed!");
  isSyncing = false;
}

function initAutoSync() {
  // Run on server startup (with 10 second delay to let DB connect)
  console.log("[AutoSync] 🕐 Will sync all courses in 10 seconds...");
  setTimeout(() => {
    syncAllCourses();
  }, 10000);

  // Schedule daily sync at 12:00 AM IST
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[AutoSync] ⏰ Midnight IST - Starting scheduled sync");
      await syncAllCourses();
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("[AutoSync] 📅 Scheduled daily sync at 12:00 AM IST");
}

module.exports = {
  syncAllCourses,
  syncCourse,
  initAutoSync,
};
