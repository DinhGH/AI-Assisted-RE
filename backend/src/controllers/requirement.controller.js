const multer = require("multer");
const PDFDocument = require("pdfkit");
const { Parser } = require("json2csv");
const config = require("../config");
const { asyncHandler, AppError } = require("../middlewares/error.middleware");
const { models } = require("../models");
const {
  extractTextFromFile,
  saveDocument,
} = require("../services/document.service");
const {
  createRequirementsFromDocument,
  reEvaluateRequirement,
  updateRequirementAndVersion,
} = require("../services/requirement.service");
const {
  enqueueRequirementAnalysis,
  getQueueStats,
} = require("../jobs/analysis.job");
const { chatWithAI } = require("../services/ai.service");

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSizeInBytes,
  },
});

const healthCheck = asyncHandler(async (req, res) => {
  res.json({ status: "ok" });
});

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, "file is required");
  }

  const content = await extractTextFromFile(req.file);
  const document = await saveDocument({
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    content,
  });

  res.status(201).json({
    document_id: document.id,
    filename: document.filename,
    content_length: content.length,
  });
});

const segmentRequirements = asyncHandler(async (req, res) => {
  const { document_id: documentId } = req.body;

  if (!documentId) {
    throw new AppError(400, "document_id is required");
  }

  const requirements = await createRequirementsFromDocument(documentId);

  await Promise.all(
    requirements.map((item) => enqueueRequirementAnalysis(item.id)),
  );

  res.status(201).json({
    total: requirements.length,
    requirement_ids: requirements.map((item) => item.id),
  });
});

const reEvaluateRequirementController = asyncHandler(async (req, res) => {
  const {
    requirement_id: requirementId,
    text,
    changed_by: changedBy,
  } = req.body;

  if (!requirementId) {
    throw new AppError(400, "requirement_id is required");
  }

  const result = await reEvaluateRequirement({
    requirementId,
    updatedText: text,
    changedBy: changedBy || "user",
  });

  res.json({
    requirement_id: requirementId,
    analysis: result.analysis,
  });
});

const updateRequirementController = asyncHandler(async (req, res) => {
  const requirementId = Number(req.params.id);
  const { text, changed_by: changedBy } = req.body;

  await updateRequirementAndVersion({
    requirementId,
    newText: text,
    changedBy: changedBy || "user",
  });

  await enqueueRequirementAnalysis(requirementId);

  res.json({
    message: "Requirement updated and queued for analysis",
    requirement_id: requirementId,
  });
});

const createRequirementController = asyncHandler(async (req, res) => {
  let {
    document_id: documentId,
    requirement_code: requirementCode,
    text,
  } = req.body;

  if (!text || !String(text).trim()) {
    throw new AppError(400, "text is required");
  }

  let targetDocumentId = documentId ? Number(documentId) : null;

  if (!targetDocumentId) {
    const manualDocument = await models.Document.create({
      filename: `manual-session-${Date.now()}.txt`,
      mimeType: "text/plain",
      content: text,
    });
    targetDocumentId = manualDocument.id;
  }

  const requirement = await models.Requirement.create({
    documentId: targetDocumentId,
    requirementCode: requirementCode || null,
    text: String(text).trim(),
    status: "pending",
  });

  await enqueueRequirementAnalysis(requirement.id);

  res.status(201).json({
    message: "Requirement created and queued for analysis",
    requirement: requirement.toJSON(),
    document_id: targetDocumentId,
  });
});

const deleteRequirementController = asyncHandler(async (req, res) => {
  const requirementId = Number(req.params.id);

  const requirement = await models.Requirement.findByPk(requirementId);
  if (!requirement) {
    throw new AppError(404, "Requirement not found");
  }

  await models.Version.destroy({ where: { requirementId } });
  await requirement.destroy();

  res.json({
    message: "Requirement deleted",
    requirement_id: requirementId,
  });
});

const listRequirements = asyncHandler(async (req, res) => {
  const documentId = req.query.document_id;
  const where = documentId ? { documentId } : undefined;

  const requirements = await models.Requirement.findAll({
    where,
    order: [["id", "ASC"]],
  });

  res.json({ requirements });
});

const chatController = asyncHandler(async (req, res) => {
  const {
    session_id: sessionId,
    message,
    mode,
    requirement_id: requirementId,
    requirement_text: requirementTextFromBody,
  } = req.body;

  if (!sessionId) {
    throw new AppError(400, "session_id is required");
  }

  const normalizedMode =
    mode === "initial" || mode === "followup" ? mode : null;

  const question = String(message || "").trim();

  const effectiveMode = normalizedMode || (question ? "followup" : "initial");

  if (effectiveMode === "followup" && !question) {
    throw new AppError(400, "message is required for followup mode");
  }

  let requirement = null;
  if (requirementId) {
    requirement = await models.Requirement.findByPk(Number(requirementId));
  }

  let requirementText =
    typeof requirementTextFromBody === "string"
      ? requirementTextFromBody.trim()
      : "";

  if (!requirementText && requirement) {
    requirementText = requirement?.text ? String(requirement.text).trim() : "";
  }

  if (!requirementText) {
    throw new AppError(
      400,
      "A selected requirement is required to start or continue requirement chat",
    );
  }

  const currentRequirementId = requirement?.id
    ? Number(requirement.id)
    : requirementId
      ? Number(requirementId)
      : null;

  if (!currentRequirementId) {
    throw new AppError(400, "requirement_id is required for requirement chat");
  }

  if (effectiveMode === "followup") {
    await models.ChatMessage.create({
      sessionId,
      requirementId: currentRequirementId,
      role: "user",
      message: question,
    });
  }

  const history = await models.ChatMessage.findAll({
    where: {
      sessionId,
      requirementId: currentRequirementId,
    },
    order: [["createdAt", "ASC"]],
  });

  let analysisPayload = {
    actor: requirement?.actor || null,
    action: requirement?.action || null,
    object: requirement?.object || null,
    ambiguity: requirement?.ambiguity ?? null,
    readability: requirement?.readability ?? null,
    similarity: requirement?.similarity ?? null,
    contradiction: requirement?.contradiction ?? null,
    clarity: requirement?.clarity ?? null,
    completeness: requirement?.completeness ?? null,
    consistency: requirement?.consistency ?? null,
    score: requirement?.score ?? null,
    status: requirement?.status || null,
    requirement_id: requirement?.id || requirementId || null,
    requirement_updated_at: requirement?.updatedAt || null,
  };

  if (requirement?.id) {
    const latestAnalysis = await models.AnalysisResult.findOne({
      where: { requirementId: requirement.id },
      order: [["createdAt", "DESC"]],
    });

    if (
      latestAnalysis?.rawResult &&
      typeof latestAnalysis.rawResult === "object"
    ) {
      analysisPayload = {
        ...latestAnalysis.rawResult,
        ...analysisPayload,
      };
    }
  }

  const assistantMessage = await chatWithAI({
    requirement: requirementText,
    analysis: analysisPayload,
    history: history.map((item) => ({
      role: item.role,
      content: item.message,
    })),
    question: effectiveMode === "initial" ? "" : question,
    mode: effectiveMode,
  });

  if (!assistantMessage) {
    throw new AppError(502, "Ollama returned an empty response");
  }

  await models.ChatMessage.create({
    sessionId,
    requirementId: currentRequirementId,
    role: "assistant",
    message: String(assistantMessage),
  });

  const updatedHistory = await models.ChatMessage.findAll({
    where: {
      sessionId,
      requirementId: currentRequirementId,
    },
    order: [["createdAt", "ASC"]],
  });

  res.json({
    session_id: sessionId,
    response: String(assistantMessage),
    history: updatedHistory.map((item) => ({
      role: item.role,
      content: item.message,
      created_at: item.createdAt,
    })),
  });
});

const metricsController = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold || 70);
  const requirements = await models.Requirement.findAll();

  let tp = 0;
  let fp = 0;
  let fn = 0;

  requirements.forEach((item) => {
    const predictedGood = (item.score || 0) >= threshold;
    const actualGood =
      (item.ambiguity || 0) <= 2 && (item.contradiction || 0) < 0.5;

    if (predictedGood && actualGood) tp += 1;
    if (predictedGood && !actualGood) fp += 1;
    if (!predictedGood && actualGood) fn += 1;
  });

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  res.json({
    precision,
    recall,
    f1,
    threshold,
    sample_size: requirements.length,
  });
});

const queueStatsController = asyncHandler(async (req, res) => {
  const stats = await getQueueStats();
  res.json({ queue: "analysis-queue", stats });
});

const exportCsvController = asyncHandler(async (req, res) => {
  const { document_id: documentId } = req.query;
  const where = documentId ? { documentId } : undefined;

  const requirements = await models.Requirement.findAll({
    where,
    order: [["id", "ASC"]],
  });

  const rows = requirements.map((item) => ({
    id: item.id,
    document_id: item.documentId,
    requirement_code: item.requirementCode,
    text: item.text,
    actor: item.actor,
    action: item.action,
    object: item.object,
    ambiguity: item.ambiguity,
    readability: item.readability,
    similarity: item.similarity,
    contradiction: item.contradiction,
    score: item.score,
    status: item.status,
  }));

  const parser = new Parser();
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=requirement-report.csv",
  );
  res.send(csv);
});

const exportPdfController = asyncHandler(async (req, res) => {
  const { document_id: documentId } = req.query;
  const where = documentId ? { documentId } : undefined;

  const requirements = await models.Requirement.findAll({
    where,
    order: [["id", "ASC"]],
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=requirement-report.pdf",
  );

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text("Requirement Analysis Report", { underline: true });
  doc.moveDown();

  requirements.forEach((item) => {
    doc
      .fontSize(11)
      .text(
        `Requirement #${item.id} ${item.requirementCode ? `(${item.requirementCode})` : ""}`,
      )
      .fontSize(10)
      .text(`Text: ${item.text}`)
      .text(`Actor: ${item.actor || "N/A"}`)
      .text(`Action: ${item.action || "N/A"}`)
      .text(`Object: ${item.object || "N/A"}`)
      .text(`Score: ${item.score ?? "N/A"}`)
      .moveDown();
  });

  doc.end();
});

module.exports = {
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
};
