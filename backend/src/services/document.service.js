const path = require("path");
const pdfParse = require("pdf-parse");
const { models } = require("../models");
const { AppError } = require("../middlewares/error.middleware");

const REQUIREMENT_CODE_REGEX = /REQ[-_ ]?\d+/i;

async function extractTextFromFile(file) {
  if (!file) {
    throw new AppError(400, "File is required");
  }

  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".pdf" || file.mimetype === "application/pdf") {
    const pdfContent = await pdfParse(file.buffer);
    return pdfContent.text || "";
  }

  if (
    extension === ".txt" ||
    extension === ".md" ||
    file.mimetype.startsWith("text/")
  ) {
    return file.buffer.toString("utf-8");
  }

  throw new AppError(415, "Unsupported file type. Allowed: PDF, TXT, MD");
}

async function saveDocument({ filename, mimeType, content }) {
  return models.Document.create({
    filename,
    mimeType,
    content,
  });
}

function segmentRequirementText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const byCode = lines
    .filter((line) => REQUIREMENT_CODE_REGEX.test(line))
    .map((line) => {
      const codeMatch = line.match(REQUIREMENT_CODE_REGEX);
      return {
        requirementCode: codeMatch ? codeMatch[0].replace(/\s+/g, "-") : null,
        text: line,
      };
    });

  if (byCode.length > 0) {
    return byCode;
  }

  /**
   * Fallback segmentation by sentence boundary when requirement codes are not present.
   */
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 10)
    .map((sentence) => ({ requirementCode: null, text: sentence }));
}

module.exports = {
  extractTextFromFile,
  saveDocument,
  segmentRequirementText,
};
