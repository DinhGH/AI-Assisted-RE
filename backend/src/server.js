const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { initDatabase } = require("./models");
const { retryAsync } = require("./utils/retry");

async function bootstrap() {
  await retryAsync(() => initDatabase(), {
    retries: Number(process.env.DB_BOOT_RETRIES || 10),
    delayMs: Number(process.env.DB_BOOT_DELAY_MS || 3000),
    label: "backend database bootstrap",
  });

  app.listen(config.server.port, () => {
    logger.info("Backend server started", {
      port: config.server.port,
      env: config.env,
    });
  });
}

bootstrap().catch((error) => {
  logger.error("Backend bootstrap failed", { error: error.message });
  process.exit(1);
});
