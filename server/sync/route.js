const express = require("express");
const router = express.Router();
const {
  fetchLecturesForCourse,
  filterLecturesWithContent,
  getUnprocessedLectures,
  markLectureAsProcessed,
  getSyncStatus,
} = require("../services/lectureSync");
const { processDocument } = require("../services/pdfService");
const { generateEmbeddings } = require("../services/vectorService");
const { upsertVectors } = require("../services/pineconeService");

// Mapping from course slug to subject ID
const SLUG_TO_SUBJECT = {
  // Semester 1
  nzwmtdd1ktye: "math1",
  cw8jd8q33uv9: "psp",
  wrskwgrpxjgu: "snw",
  // Semester 2
  ah5qi2u9urrt: "dsa",
  zqg6ta3917k0: "wap",
  x0n0l9p7wnzr: "math2",
  // Semester 3
  "71w36ui55vki": "ada",
  "5yr840e54q5a": "ada",
  "9qlmemzzpt6b": "ap",
  p0f65o4fjzji: "ap",
  "6addtk39hy8c": "dbms",
  ico8pvge0zhd: "dbms",
  yai5rx2h6q6k: "math3",
  c7134jweubad: "math3",
  // Semester 4
  ok58b70d78xa: "dm",
  c6c54c31a81s: "dva",
  o781u1d61228: "genai",
  f52au2c8qoqs: "sdse",
};

router.post("/:courseSlug", async (req, res) => {
  const { courseSlug } = req.params;
  const subjectId = SLUG_TO_SUBJECT[courseSlug] || courseSlug;

  try {
    console.log(
      `[Sync] Starting sync for course: ${courseSlug} (subjectId: ${subjectId})`,
    );

    const allLectures = await fetchLecturesForCourse(courseSlug);
    console.log(`[Sync] Found ${allLectures.length} total lectures`);

    const lecturesWithContent = await filterLecturesWithContent(allLectures);
    console.log(`[Sync] ${lecturesWithContent.length} lectures have content`);

    const unprocessedLectures =
      await getUnprocessedLectures(lecturesWithContent);
    console.log(`[Sync] ${unprocessedLectures.length} new lectures to process`);

    if (unprocessedLectures.length === 0) {
      return res.json({
        success: true,
        message: "All lectures already processed",
        stats: {
          total: allLectures.length,
          withContent: lecturesWithContent.length,
          newlyProcessed: 0,
        },
      });
    }

    const results = [];

    for (const lecture of unprocessedLectures) {
      try {
        console.log(`\n[Sync] Processing: ${lecture.title} (${lecture.hash})`);

        const chunks = await processDocument(lecture.whiteboard_file);

        if (chunks.length === 0) {
          console.log(`[Sync] No content extracted, skipping`);
          continue;
        }

        const embeddings = await generateEmbeddings(chunks);

        const vectorCount = await upsertVectors(
          lecture.hash,
          chunks,
          embeddings,
          {
            title: lecture.title,
            course: lecture.course?.short_display_name || "Unknown",
          },
          subjectId, // Now correctly passing subjectId
        );

        await markLectureAsProcessed(lecture, vectorCount);

        results.push({
          hash: lecture.hash,
          title: lecture.title,
          vectorCount: vectorCount,
          success: true,
        });

        console.log(`[Sync] ✅ Completed: ${lecture.title}`);
      } catch (error) {
        console.error(`[Sync] ❌ Failed: ${lecture.title}`, error.message);
        results.push({
          hash: lecture.hash,
          title: lecture.title,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.filter((r) => r.success).length} lectures`,
      stats: {
        total: allLectures.length,
        withContent: lecturesWithContent.length,
        newlyProcessed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      results: results,
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/status", async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
