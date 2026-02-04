const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5001;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5174",
    credentials: true,
  }),
);

connectDB();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./auth/route"));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
