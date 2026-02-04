const { getIndex } = require("../config/pinecone");

async function upsertVectors(
  lectureHash,
  chunks,
  embeddings,
  metadata,
  subjectId,
) {
  const index = getIndex();
  const namespace = subjectId || "default";

  console.log(
    `[Pinecone] Creating ${embeddings.length} vectors for ${lectureHash}`,
  );

  if (!embeddings || embeddings.length === 0) {
    console.log("[Pinecone] No embeddings to upsert");
    return 0;
  }

  // Create records array
  const records = embeddings.map((embedding, i) => ({
    id: `${lectureHash}_${i}`,
    values: Array.from(embedding).map((v) => Number(v)),
    metadata: {
      lectureHash: String(lectureHash),
      title: String(metadata.title || "Unknown"),
      course: String(metadata.course || "Unknown"),
      subjectId: String(subjectId || "unknown"),
      chunkIndex: Number(i),
      chunkText: String(chunks[i] ? chunks[i].substring(0, 500) : ""),
    },
  }));

  console.log(`[Pinecone] Records to upsert: ${records.length}`);

  try {
    const ns = index.namespace(namespace);

    // Upsert in batches - SDK expects { records: [...] }
    const BATCH_SIZE = 50;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(
        `[Pinecone] Upserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records) to ${namespace}`,
      );

      await ns.upsert({ records: batch });
      totalUpserted += batch.length;
    }

    console.log(
      `[Pinecone] ✅ Upserted ${totalUpserted} vectors for ${lectureHash}`,
    );
    return totalUpserted;
  } catch (error) {
    console.error(`[Pinecone] Upsert error:`, error.message);
    throw error;
  }
}

async function queryVectors(queryEmbedding, subjectId, topK = 5) {
  const index = getIndex();
  const namespace = subjectId || "default";

  const results = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK: topK,
    includeMetadata: true,
  });

  return results.matches || [];
}

async function deleteVectorsByLecture(lectureHash, subjectId) {
  const index = getIndex();
  const namespace = subjectId || "default";

  await index.namespace(namespace).deleteMany({
    filter: { lectureHash: lectureHash },
  });
  console.log(`[Pinecone] Deleted vectors for ${lectureHash}`);
}

module.exports = {
  upsertVectors,
  queryVectors,
  deleteVectorsByLecture,
};
