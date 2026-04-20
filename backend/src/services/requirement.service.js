const { models } = require("../models");
const { AppError } = require("../middlewares/error.middleware");
const { segmentRequirementText } = require("./document.service");
const { analyzeRequirementById } = require("./analysis.service");

async function createRequirementsFromDocument(documentId) {
  const document = await models.Document.findByPk(documentId);

  if (!document) {
    throw new AppError(404, "Document not found");
  }

  const segments = segmentRequirementText(document.content);

  if (segments.length === 0) {
    throw new AppError(422, "No requirement-like content found to segment");
  }

  const payload = segments.map((segment) => ({
    documentId,
    requirementCode: segment.requirementCode,
    text: segment.text,
    status: "pending",
  }));

  return models.Requirement.bulkCreate(payload);
}

async function updateRequirementAndVersion({
  requirementId,
  newText,
  changedBy = "system",
}) {
  const requirement = await models.Requirement.findByPk(requirementId);

  if (!requirement) {
    throw new AppError(404, "Requirement not found");
  }

  if (!newText || !newText.trim()) {
    throw new AppError(400, "new_text is required");
  }

  if (requirement.text !== newText.trim()) {
    await models.Version.create({
      requirementId,
      previousText: requirement.text,
      previousScore: requirement.score,
      changedBy,
    });

    await requirement.update({
      text: newText.trim(),
      status: "pending",
    });
  }

  return requirement;
}

async function reEvaluateRequirement({
  requirementId,
  updatedText,
  changedBy = "system",
}) {
  if (updatedText) {
    await updateRequirementAndVersion({
      requirementId,
      newText: updatedText,
      changedBy,
    });
  }

  return analyzeRequirementById(requirementId);
}

module.exports = {
  createRequirementsFromDocument,
  updateRequirementAndVersion,
  reEvaluateRequirement,
};
