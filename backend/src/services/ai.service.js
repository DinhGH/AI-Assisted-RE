const axios = require("axios");
const config = require("../config");
const { AppError } = require("../middlewares/error.middleware");

const aiClient = axios.create({
  baseURL: config.aiEngine.baseUrl,
  timeout: 15000,
});

async function analyzeText(text) {
  try {
    const response = await aiClient.post("/analyze", { text });
    return response.data;
  } catch (error) {
    throw new AppError(502, "Failed to call AI engine analyze endpoint", {
      reason: error.message,
    });
  }
}

async function chatWithAi(payload) {
  try {
    const response = await aiClient.post("/chat", payload);
    return response.data;
  } catch (error) {
    throw new AppError(502, "Failed to call AI engine chat endpoint", {
      reason: error.message,
    });
  }
}

module.exports = {
  analyzeText,
  chatWithAi,
};
