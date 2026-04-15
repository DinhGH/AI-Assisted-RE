const dotenv = require("dotenv");

dotenv.config();

/**
 * Central configuration module.
 *
 * WHY: We keep all environment reads in one place so application code stays
 * deterministic and easier to test.
 */
const config = {
  env: process.env.NODE_ENV || "development",
  appName: process.env.APP_NAME || "ai-assisted-requirement-quality-analysis",
  server: {
    port: Number(process.env.PORT || 3000),
  },
  db: {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || "ai_re_analysis",
    username: process.env.MYSQL_USER || "ai_user",
    password: process.env.MYSQL_PASSWORD || "ai_password",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  },
  aiEngine: {
    baseUrl: process.env.AI_ENGINE_URL || "http://localhost:8000",
  },
  upload: {
    maxFileSizeInBytes: 10 * 1024 * 1024,
  },
  queue: {
    analysisQueueName: "analysis-queue",
  },
};

module.exports = config;
