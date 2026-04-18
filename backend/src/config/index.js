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
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "qwen2.5:0.5b",
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 600000),
    temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2),
    maxTokens: Number(process.env.OLLAMA_MAX_TOKENS || 256),
    contextWindow: Number(process.env.OLLAMA_CONTEXT_WINDOW || 2048),
    maxHistoryMessages: Number(process.env.OLLAMA_MAX_HISTORY_MESSAGES || 10),
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || "30m",
    warmupEnabled:
      String(process.env.OLLAMA_WARMUP_ENABLED || "true").toLowerCase() !==
      "false",
  },
  groq: {
    enabled:
      String(process.env.GROQ_ENABLED || "false").toLowerCase() === "true",
    apiKey: process.env.GROQ_API_KEY || "",
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 60000),
    temperature: Number(process.env.GROQ_TEMPERATURE || 0.3),
    maxTokens: Number(process.env.GROQ_MAX_TOKENS || 512),
  },
  upload: {
    maxFileSizeInBytes: 10 * 1024 * 1024,
  },
  queue: {
    analysisQueueName: "analysis-queue",
  },
};

module.exports = config;
