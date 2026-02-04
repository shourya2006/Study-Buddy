const express = require("express");
const router = express.Router();
const {
  fetchLecturesForCourse,
  filterLecturesWithPDF,
  getUnprocessedLectures,
  markLectureAsProcessed,
  getSyncStatus,
} = require("../services/lectureSync");
const { processPDF } = require("../services/pdfService");
const { generateEmbeddings } = require("../services/vectorService");
const { upsertVectors } = require("../services/pineconeService");

// POST /api/sync/:courseSlug - Sync lectures for a course
router.post("/:courseSlug", async (req, res) => {
  const { courseSlug } = req.params;

  try {
    console.log(`[Sync] Starting sync for course: ${courseSlug}`);

    // 1. Fetch all lectures
    const allLectures = await fetchLecturesForCourse(courseSlug);
    console.log(`[Sync] Found ${allLectures.length} total lectures`);

    // 2. Filter lectures with PDFs
    const lecturesWithPDF = await filterLecturesWithPDF(allLectures);
    console.log(`[Sync] ${lecturesWithPDF.length} lectures have PDFs`);

    // 3. Get unprocessed lectures
    const unprocessedLectures = await getUnprocessedLectures(lecturesWithPDF);
    console.log(`[Sync] ${unprocessedLectures.length} new lectures to process`);

    if (unprocessedLectures.length === 0) {
      return res.json({
        success: true,
        message: "All lectures already processed",
        stats: {
          total: allLectures.length,
          withPDF: lecturesWithPDF.length,
          newlyProcessed: 0,
        },
      });
    }

    const results = [];

    // 4. Process each lecture
    for (const lecture of unprocessedLectures) {
      try {
        console.log(`\n[Sync] Processing: ${lecture.title} (${lecture.hash})`);

        // Download and parse PDF
        const chunks = await processPDF(lecture.whiteboard_file);

        if (chunks.length === 0) {
          console.log(`[Sync] No content extracted, skipping`);
          continue;
        }

        // Generate embeddings
        const embeddings = await generateEmbeddings(chunks);

        // Store in Pinecone
        const vectorCount = await upsertVectors(
          lecture.hash,
          chunks,
          embeddings,
          {
            title: lecture.title,
            course: lecture.course?.short_display_name || "Unknown",
          },
        );

        // Mark as processed
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
        withPDF: lecturesWithPDF.length,
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

// GET /api/sync/status - Get sync status
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
