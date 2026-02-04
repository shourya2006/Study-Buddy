const axios = require("axios");
const { ensureToken } = require("./newtonToken");
require("dotenv").config();

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const CLIENT_ID = process.env.NEWTON_CLIENT_ID;
const CLIENT_SECRET = process.env.NEWTON_CLIENT_SECRET;

async function downloadPDF(url) {
  const token = await ensureToken();

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${token}`,
      "client-id": CLIENT_ID,
      "client-secret": CLIENT_SECRET,
    },
  });

  return Buffer.from(response.data);
}

async function parsePDF(pdfBuffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(pdfBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

function splitIntoChunks(
  text,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= text.length - overlap) break;
  }

  return chunks;
}

async function processPDF(url) {
  try {
    console.log(`[PDF] Downloading: ${url}`);
    const pdfBuffer = await downloadPDF(url);

    console.log(`[PDF] Parsing PDF...`);
    const text = await parsePDF(pdfBuffer);

    console.log(`[PDF] Extracted ${text.length} characters`);
    const chunks = splitIntoChunks(text);
    console.log(`[PDF] Split into ${chunks.length} chunks`);

    return chunks;
  } catch (error) {
    console.error(`[PDF] Error processing PDF:`, error);
    throw error;
  }
}

module.exports = {
  downloadPDF,
  parsePDF,
  splitIntoChunks,
  processPDF,
};
