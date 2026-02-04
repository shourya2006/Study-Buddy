const mongoose = require("mongoose");

const NewtonTokenSchema = new mongoose.Schema({
  key: {
    type: String,
    default: "newton_token",
    unique: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  userName: String,
  userEmail: String,
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("NewtonToken", NewtonTokenSchema);
