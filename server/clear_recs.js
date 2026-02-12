const mongoose = require("mongoose");
const VideoRecommendation = require("./models/VideoRecommendation.model");
require("dotenv").config({ path: "./recommendation/.env" });

const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI)
  .then(async () => {
    await VideoRecommendation.deleteMany({});
    console.log("Cleared VideoRecommendation collection");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
