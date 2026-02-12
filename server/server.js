const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./db");
const { initNewtonTokenCron } = require("./services/newtonToken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5001;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

connectDB();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

initNewtonTokenCron();

const { initAutoSync } = require("./services/autoSync");
initAutoSync();

const cron = require("node-cron");
const { refreshAllSubjects } = require("./services/recommendationCacheService");

function initRecommendationSync() {
  // 1. Run on startup after a delay (to let autoSync finish or DB connect)
  console.log("[VideoRec] Will check for new topics in 30 seconds...");
  setTimeout(() => {
    refreshAllSubjects().catch((err) =>
      console.error("[VideoRec] Startup refresh error:", err.message),
    );
  }, 30000);

  // 2. Schedule daily at 12:00 AM IST
  cron.schedule(
    "0 0 * * *",
    () => {
      console.log("[Cron] 12:00 AM IST — Refreshing video recommendations...");
      refreshAllSubjects().catch((err) =>
        console.error("[Cron] Refresh error:", err.message),
      );
    },
    {
      timezone: "Asia/Kolkata",
    },
  );
  console.log("[VideoRec] Scheduled daily refresh at 12:00 AM IST");
}

initRecommendationSync();

app.use("/api/auth", require("./auth/route"));
app.use("/api/courses", require("./courses/route"));
app.use("/api/sync", require("./sync/route"));
app.use("/api/chat", require("./chat/route"));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
