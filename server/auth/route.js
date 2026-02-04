const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const fetchuser = require("../middlewares/fetchuser");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh-fallback-secret";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ user: { id: userId } }, JWT_SECRET, {
    expiresIn: "1d",
    issuer: "StudyBuddy",
    audience: "StudyBuddy-Client",
  });

  const refreshToken = jwt.sign({ user: { id: userId } }, REFRESH_SECRET, {
    expiresIn: "30d",
    issuer: "StudyBuddy",
    audience: "StudyBuddy-Client",
  });

  return { accessToken, refreshToken };
};

// ROUTE 1: Register a new user - POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { id, secret } = req.body;

    if (!id || !secret) {
      return res.status(400).json({ error: "ID and Secret are required" });
    }

    if (secret.length < 6) {
      return res
        .status(400)
        .json({ error: "Secret must be at least 6 characters" });
    }

    let user = await User.findOne({ id });
    if (user) {
      return res.status(400).json({ error: "Operative ID already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedSecret = await bcrypt.hash(secret, salt);

    user = await User.create({
      id,
      secret: hashedSecret,
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      accessToken,
      refreshToken,
      user: { id: user.id },
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ROUTE 2: Login user - POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { id, secret } = req.body;

    if (!id || !secret) {
        console.log(id, secret);
      return res.status(400).json({ error: "ID and Secret are required" });
    }

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(secret, user.secret);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      success: true,
      message: "Authentication successful",
      accessToken,
      refreshToken,
      user: { id: user.id },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ROUTE 3: Refresh token - POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, {
      issuer: "StudyBuddy",
      audience: "StudyBuddy-Client",
    });

    const user = await User.findOne({ id: decoded.user.id });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Refresh token expired. Please login again." });
    }
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ROUTE 4: Get user profile - GET /api/auth/profile (Protected)
router.get("/profile", fetchuser, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select("-secret");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile fetch error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
