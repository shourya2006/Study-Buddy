const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1024;

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

async function generateEmbeddings(chunks) {
  const embeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Embedding] Processing chunk ${i + 1}/${chunks.length}`);
    const embedding = await generateEmbedding(chunks[i]);
    embeddings.push(embedding);
  }

  return embeddings;
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_DIMENSIONS,
};
