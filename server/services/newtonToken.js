const cron = require("node-cron");
const axios = require("axios");
require("dotenv").config();

// In-memory token storage (you can move this to Redis or DB for persistence)
let newtonToken = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

const NEWTON_API_URL = "https://my.newtonschool.co/api/v1/user/login/";
const CLIENT_ID = process.env.NEWTON_CLIENT_ID;
const CLIENT_SECRET = process.env.NEWTON_CLIENT_SECRET;

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
      newtonToken.accessToken = response.data.access_token;
      newtonToken.refreshToken = response.data.refresh_token || null;
      // Use expires_in from response (in seconds)
      const expiresInMs = (response.data.expires_in || 23 * 60 * 60) * 1000;
      newtonToken.expiresAt = Date.now() + expiresInMs;

      console.log("[Newton Token] ✅ Token fetched successfully!");
      console.log(
        "[Newton Token] User:",
        response.data.name,
        response.data.email,
      );
      console.log(
        "[Newton Token] Expires at:",
        new Date(newtonToken.expiresAt).toISOString(),
      );
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

function getNewtonToken() {
  return newtonToken.accessToken;
}

function isTokenValid() {
  if (!newtonToken.accessToken) return false;
  if (!newtonToken.expiresAt) return false;
  return Date.now() < newtonToken.expiresAt;
}

async function ensureToken() {
  if (!isTokenValid()) {
    console.log("[Newton Token] Token missing or expired, fetching new one...");
    await fetchNewtonToken();
  }
  return newtonToken.accessToken;
}

function initNewtonTokenCron() {
  // Fetch token on startup if not available
  if (!isTokenValid()) {
    console.log("[Newton Token] No valid token on startup, fetching...");
    fetchNewtonToken();
  }

  // Schedule cron job for 12:00 AM IST (which is 6:30 PM UTC previous day)
  // IST is UTC+5:30, so 12:00 AM IST = 18:30 UTC (previous day)
  // Cron format: minute hour day month weekday
  cron.schedule(
    "30 18 * * *",
    async () => {
      console.log("[Newton Token] ⏰ Scheduled token refresh (12:00 AM IST)");
      await fetchNewtonToken();
    },
    {
      timezone: "Asia/Kolkata", // Use IST timezone directly
    },
  );

  // Alternative: Run at midnight IST using timezone option
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
