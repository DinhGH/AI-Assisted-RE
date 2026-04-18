const config = require("./config");
const logger = require("./utils/logger");
const { initDatabase, sequelize } = require("./models");
const { initAnalysisWorker, analysisQueue } = require("./jobs/analysis.job");
const { retryAsync } = require("./utils/retry");

async function bootstrapWorker() {
  const skipSchemaSync =
    String(process.env.WORKER_SKIP_SCHEMA_SYNC || "true").toLowerCase() !==
    "false";

  if (skipSchemaSync) {
    await retryAsync(() => sequelize.authenticate(), {
      retries: Number(process.env.DB_BOOT_RETRIES || 10),
      delayMs: Number(process.env.DB_BOOT_DELAY_MS || 3000),
      label: "worker database connectivity check",
    });
  } else {
    await retryAsync(() => initDatabase(), {
      retries: Number(process.env.DB_BOOT_RETRIES || 10),
      delayMs: Number(process.env.DB_BOOT_DELAY_MS || 3000),
      label: "worker database bootstrap",
    });
  }

  initAnalysisWorker({
    concurrency: Number(process.env.QUEUE_CONCURRENCY || 2),
  });

  logger.info("Analysis worker is running", {
    queue: config.queue.analysisQueueName,
    redisHost: config.redis.host,
    redisPort: config.redis.port,
  });
}

async function shutdown(signal) {
  logger.warn("Worker shutdown signal received", { signal });
  await analysisQueue.close();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

bootstrapWorker().catch((error) => {
  logger.error("Worker bootstrap failed", { error: error.message });
  process.exit(1);
});
