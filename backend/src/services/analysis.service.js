const { models } = require("../models");
const { analyzeText } = require("./ai.service");
const { AppError } = require("../middlewares/error.middleware");

/**
 * Applies AI analysis and persists both latest state and immutable history.
 */
async function analyzeRequirementById(requirementId) {
  const requirement = await models.Requirement.findByPk(requirementId);

  if (!requirement) {
    throw new AppError(404, "Requirement not found");
  }

  const aiResult = await analyzeText(requirement.text);

  await models.AnalysisResult.create({
    requirementId,
    actor: aiResult.actor || null,
    action: aiResult.action || null,
    object: aiResult.object || null,
    ambiguity: aiResult.ambiguity ?? null,
    readability: aiResult.readability ?? null,
    similarity: aiResult.similarity ?? null,
    contradiction: aiResult.contradiction ?? null,
    clarity: aiResult.clarity ?? null,
    completeness: aiResult.completeness ?? null,
    consistency: aiResult.consistency ?? null,
    score: aiResult.score ?? null,
    rawResult: aiResult,
  });

  await requirement.update({
    actor: aiResult.actor || null,
    action: aiResult.action || null,
    object: aiResult.object || null,
    ambiguity: aiResult.ambiguity ?? null,
    readability: aiResult.readability ?? null,
    similarity: aiResult.similarity ?? null,
    contradiction: aiResult.contradiction ?? null,
    clarity: aiResult.clarity ?? null,
    completeness: aiResult.completeness ?? null,
    consistency: aiResult.consistency ?? null,
    score: aiResult.score ?? null,
    status: "analyzed",
  });

  return {
    requirement,
    analysis: aiResult,
  };
}

module.exports = {
  analyzeRequirementById,
};
