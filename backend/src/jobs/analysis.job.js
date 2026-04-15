const Bull = require("bull");
const config = require("../config");
const logger = require("../utils/logger");
const { analyzeRequirementById } = require("../services/analysis.service");
const { models } = require("../models");

const analysisQueue = new Bull(config.queue.analysisQueueName, {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

function initAnalysisWorker({ concurrency = 2 } = {}) {
  analysisQueue.process(concurrency, async (job) => {
    const { requirementId } = job.data;
    await analyzeRequirementById(requirementId);
    logger.info("Requirement analyzed by worker", { requirementId });
  });

  analysisQueue.on("completed", (job) => {
    logger.info("Analysis job completed", {
      jobId: job.id,
      requirementId: job.data.requirementId,
    });
  });

  analysisQueue.on("failed", async (job, error) => {
    logger.error("Analysis job failed", {
      requirementId: job.data.requirementId,
      error: error.message,
    });

    if (job?.data?.requirementId) {
      await models.Requirement.update(
        { status: "failed" },
        { where: { id: job.data.requirementId } },
      );
    }
  });

  logger.info("Analysis worker initialized", {
    queue: config.queue.analysisQueueName,
    concurrency,
  });
}

async function enqueueRequirementAnalysis(requirementId) {
  await analysisQueue.add(
    { requirementId },
    {
      jobId: `requirement-${requirementId}-${Date.now()}`,
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: "fixed",
        delay: 2000,
      },
    },
  );
}

async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    analysisQueue.getWaitingCount(),
    analysisQueue.getActiveCount(),
    analysisQueue.getCompletedCount(),
    analysisQueue.getFailedCount(),
    analysisQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

module.exports = {
  analysisQueue,
  initAnalysisWorker,
  enqueueRequirementAnalysis,
  getQueueStats,
};
