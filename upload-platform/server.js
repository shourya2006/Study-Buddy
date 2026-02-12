const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { Pinecone } = require("@pinecone-database/pinecone");
const OpenAI = require("openai");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

const app = express();
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
app.use(cors());
app.use(express.static("public"));

const PORT = 5500;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "studybuddy";
const MIN_TEXT_DENSITY_THRESHOLD = 50;

if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
  console.error("Missing API Keys in ../server/.env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

let ocrScheduler = null;

async function initializeOCR() {
  if (ocrScheduler) return ocrScheduler;

  console.log("[OCR] Initializing Tesseract...");
  ocrScheduler = Tesseract.createScheduler();

  for (let i = 0; i < 2; i++) {
    const worker = await Tesseract.createWorker("eng", 1, {
      cachePath: "/tmp/tesseract-cache",
    });
    ocrScheduler.addWorker(worker);
  }

  console.log("[OCR] Ready");
  return ocrScheduler;
}

async function preprocessImage(imageBuffer) {
  try {
    return await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(128)
      .png()
      .toBuffer();
  } catch {
    return imageBuffer;
  }
}

async function extractTextLayer(pdfBuffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const uint8Array = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
  });
  const pdf = await loadingTask.promise;

  let fullText = "";
  const pageTextLengths = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
    pageTextLengths.push(pageText.length);
  }

  return { text: fullText, pageTextLengths, numPages: pdf.numPages };
}

async function renderPagesToImages(pdfBuffer, pagesToRender = []) {
  const { pdf } = await import("pdf-to-img");
  const images = [];
  let pageIndex = 0;

  try {
    const document = await pdf(pdfBuffer, { scale: 1.5 });

    for await (const image of document) {
      pageIndex++;

      if (pagesToRender.length === 0 || pagesToRender.includes(pageIndex)) {
        images.push({ pageNum: pageIndex, buffer: Buffer.from(image) });
        console.log(`[PDF] Rendered page ${pageIndex}`);
      }
    }
  } catch (error) {
    console.error(`[PDF] Render error: ${error.message}`);
  }

  return images;
}

async function performOCR(imageBuffers) {
  const scheduler = await initializeOCR();

  const results = await Promise.all(
    imageBuffers.map(async (buffer, i) => {
      try {
        const processed = await preprocessImage(buffer);
        const { data } = await scheduler.addJob("recognize", processed);
        console.log(`[OCR] Page ${i + 1}: ${data.text.length} chars`);
        return data.text.trim();
      } catch {
        return "";
      }
    }),
  );

  return results.join("\n\n");
}

async function parseMultiLayerPDF(pdfBuffer) {
  console.log("[PDF] Multi-layer extraction...");

  const { text, pageTextLengths, numPages } = await extractTextLayer(pdfBuffer);
  console.log(`[PDF] Text layer: ${text.length} chars from ${numPages} pages`);

  const pagesNeedingOCR = [];
  for (let i = 0; i < pageTextLengths.length; i++) {
    if (pageTextLengths[i] < MIN_TEXT_DENSITY_THRESHOLD) {
      pagesNeedingOCR.push(i + 1);
    }
  }

  let ocrText = "";
  if (pagesNeedingOCR.length > 0) {
    console.log(`[PDF] OCR needed for pages: ${pagesNeedingOCR.join(", ")}`);
    const images = await renderPagesToImages(pdfBuffer, pagesNeedingOCR);
    ocrText = await performOCR(images.map((img) => img.buffer));
    console.log(`[PDF] OCR extracted: ${ocrText.length} chars`);
  }

  const combined = [text.trim(), ocrText.trim()].filter(Boolean).join("\n\n");
  return combined;
}

async function parsePPTX(pptxBuffer) {
  const { OfficeParser } = require("officeparser");
  const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.pptx`);
  try {
    fs.writeFileSync(tempFile, pptxBuffer);
    const result = await OfficeParser.parseOffice(tempFile, {
      extractAttachments: false,
    });
    return typeof result === "string" ? result : JSON.stringify(result);
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  const cleanText = text.replace(/\s+/g, " ").trim();
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end).trim());
    start = end - overlap;
    if (start >= cleanText.length - overlap) break;
  }
  return chunks;
}

async function generateEmbeddings(chunks) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
    encoding_format: "float",
    dimensions: 1024,
  });
  return response.data.map((item) => item.embedding);
}

async function upsertToPinecone(embeddings, chunks, subjectId, filename, hash) {
  const index = pc.index(PINECONE_INDEX_NAME);
  const ns = index.namespace(subjectId);

  const records = embeddings.map((emb, i) => ({
    id: `${hash}_${i}`,
    values: emb,
    metadata: {
      title: filename,
      course: "Direct Upload",
      subjectId: subjectId,
      chunkText: chunks[i],
      chunkIndex: i,
    },
  }));

  const BATCH_SIZE = 50;
  let total = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;

    console.log(`Upserting batch of ${batch.length} records`);
    try {
      await ns.upsert({ records: batch });
      total += batch.length;
    } catch (e) {
      console.error(`Upsert failed: ${e.message}`);
      throw e;
    }
  }
  return total;
}

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const { subjectId } = req.body;
    const files = req.files;

    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files" });
    if (!subjectId)
      return res.status(400).json({ error: "No subject selected" });

    console.log(`Processing ${files.length} files for ${subjectId}...`);

    const results = [];

    for (const file of files) {
      try {
        let text = "";
        if (file.mimetype === "application/pdf") {
          text = await parseMultiLayerPDF(file.buffer);
        } else if (
          file.mimetype.includes("presentation") ||
          file.mimetype.includes("powerpoint")
        ) {
          text = await parsePPTX(file.buffer);
        } else {
          continue;
        }

        if (!text.trim()) continue;

        const chunks = splitIntoChunks(text);
        const embeddings = await generateEmbeddings(chunks);
        const hash = crypto
          .createHash("md5")
          .update(file.originalname)
          .digest("hex");

        const vectors = await upsertToPinecone(
          embeddings,
          chunks,
          subjectId,
          file.originalname,
          hash,
        );
        results.push({ file: file.originalname, vectors });
        console.log(`Uploaded ${file.originalname}: ${vectors} vectors`);
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err.message);
        results.push({ file: file.originalname, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Upload Platform running at http://localhost:${PORT}`);
});
