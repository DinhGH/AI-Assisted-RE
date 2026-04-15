const express = require("express");
const {
  uploadMiddleware,
  healthCheck,
  uploadDocument,
  segmentRequirements,
  reEvaluateRequirementController,
  createRequirementController,
  deleteRequirementController,
  updateRequirementController,
  listRequirements,
  chatController,
  queueStatsController,
  metricsController,
  exportCsvController,
  exportPdfController,
} = require("../controllers/requirement.controller");

const router = express.Router();

router.get("/health", healthCheck);
router.post("/upload", uploadMiddleware.single("file"), uploadDocument);
router.post("/requirements/segment", segmentRequirements);
router.get("/requirements", listRequirements);
router.post("/requirements", createRequirementController);
router.put("/requirements/:id", updateRequirementController);
router.delete("/requirements/:id", deleteRequirementController);
router.post("/requirements/re-evaluate", reEvaluateRequirementController);
router.post("/chat", chatController);
router.get("/queue/stats", queueStatsController);
router.get("/metrics", metricsController);
router.get("/export/csv", exportCsvController);
router.get("/export/pdf", exportPdfController);

module.exports = router;
