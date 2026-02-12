const mongoose = require("mongoose");
const VideoRecommendation = require("./server/models/VideoRecommendation.model");
require("dotenv").config({ path: "./server/recommendation/.env" });

const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const count = await VideoRecommendation.countDocuments();
    console.log(`VideoRecommendation count: ${count}`);
    const recs = await VideoRecommendation.find()
      .sort({ lastUpdated: -1 })
      .limit(1)
      .lean();
    if (recs.length > 0) {
      console.log("Latest recommendation:", JSON.stringify(recs[0], null, 2));
    }
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
