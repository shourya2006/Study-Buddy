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

// Session for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize Newton Token Cron Job
initNewtonTokenCron();

// Routes
app.use("/api/auth", require("./auth/route"));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
