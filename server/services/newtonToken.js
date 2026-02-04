const cron = require("node-cron");
const axios = require("axios");
const NewtonToken = require("../models/NewtonToken.model");
require("dotenv").config();

const NEWTON_API_URL = "https://my.newtonschool.co/api/v1/user/login/";
const CLIENT_ID = process.env.NEWTON_CLIENT_ID;
const CLIENT_SECRET = process.env.NEWTON_CLIENT_SECRET;
const TOKEN_KEY = "newton_token";

async function fetchNewtonToken() {
  try {
    console.log("[Newton Token] Fetching new access token...");

    const response = await axios.post(
      NEWTON_API_URL,
      {
        backend: "email",
        email: process.env.NEWTON_EMAIL,
        utmParams: {
          marketing_url_structure_slug: "newton-web-main-login-form-email",
        },
        password: process.env.NEWTON_PASSWORD,
        "client-id": CLIENT_ID,
        "client-secret": CLIENT_SECRET,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "client-id": CLIENT_ID,
          "client-secret": CLIENT_SECRET,
        },
      },
    );

    if (response.data && response.data.access_token) {
      const expiresInMs = (response.data.expires_in || 23 * 60 * 60) * 1000;
      const expiresAt = new Date(Date.now() + expiresInMs);

      // Save to database
      await NewtonToken.findOneAndUpdate(
        { key: TOKEN_KEY },
        {
          key: TOKEN_KEY,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || null,
          expiresAt: expiresAt,
          userName: response.data.name,
          userEmail: response.data.email,
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      console.log("[Newton Token] ✅ Token fetched and saved to DB!");
      console.log(
        "[Newton Token] User:",
        response.data.name,
        response.data.email,
      );
      console.log("[Newton Token] Expires at:", expiresAt.toISOString());
      return true;
    } else {
      console.error("[Newton Token] ❌ No token in response:", response.data);
      return false;
    }
  } catch (error) {
    console.error(
      "[Newton Token] ❌ Failed to fetch token:",
      error.response?.data || error.message,
    );
    return false;
  }
}

async function getNewtonToken() {
  const tokenDoc = await NewtonToken.findOne({ key: TOKEN_KEY });
  return tokenDoc ? tokenDoc.accessToken : null;
}

async function isTokenValid() {
  const tokenDoc = await NewtonToken.findOne({ key: TOKEN_KEY });
  if (!tokenDoc || !tokenDoc.accessToken || !tokenDoc.expiresAt) return false;
  return new Date() < tokenDoc.expiresAt;
}

async function ensureToken() {
  const valid = await isTokenValid();
  if (!valid) {
    console.log("[Newton Token] Token missing or expired, fetching new one...");
    await fetchNewtonToken();
  }
  return await getNewtonToken();
}

async function initNewtonTokenCron() {
  // Fetch token on startup if not available
  const valid = await isTokenValid();
  if (!valid) {
    console.log("[Newton Token] No valid token on startup, fetching...");
    await fetchNewtonToken();
  } else {
    const tokenDoc = await NewtonToken.findOne({ key: TOKEN_KEY });
    console.log(
      "[Newton Token] ✅ Valid token found in DB, expires:",
      tokenDoc.expiresAt,
    );
  }

  // Schedule cron job for 12:00 AM IST
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Newton Token] ⏰ Midnight IST token refresh");
      await fetchNewtonToken();
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("[Newton Token] 🕐 Cron job scheduled for 12:00 AM IST daily");
}

module.exports = {
  fetchNewtonToken,
  getNewtonToken,
  isTokenValid,
  ensureToken,
  initNewtonTokenCron,
};
