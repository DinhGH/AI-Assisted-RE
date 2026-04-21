const axios = require("axios");
const config = require("../config");
const { AppError } = require("../middlewares/error.middleware");

const INITIAL_MIN_WORDS = 90;

const aiClient = axios.create({
  baseURL: config.aiEngine.baseUrl,
  timeout: 60000,
});

const ollamaClient = axios.create({
  baseURL: config.ollama.baseUrl,
  timeout: config.ollama.timeoutMs,
});

const groqClient = axios.create({
  baseURL: config.groq.baseUrl,
  timeout: config.groq.timeoutMs,
});

async function analyzeText(text) {
  try {
    const response = await aiClient.post("/analyze", { text });
    return response.data;
  } catch (error) {
    throw new AppError(502, "Failed to call AI engine analyze endpoint", {
      reason: error.message,
    });
  }
}

function formatHistory(history = []) {
  const maxMessages = Math.max(
    0,
    Number(config.ollama.maxHistoryMessages || 6),
  );
  const safeHistory = history.slice(-maxMessages);

  return safeHistory
    .map((item) => {
      const role = String(item?.role || "").trim() || "user";
      const rawContent = String(item?.content ?? item?.message ?? "").trim();
      const content =
        rawContent.length > 240 ? `${rawContent.slice(0, 240)}...` : rawContent;

      if (!content) {
        return null;
      }

      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");
}

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function compactAnalysis(analysis = {}) {
  return {
    clarity: analysis?.clarity ?? null,
    completeness: analysis?.completeness ?? null,
    consistency: analysis?.consistency ?? null,
    ambiguity: analysis?.ambiguity ?? null,
    ambiguity_count: analysis?.ambiguity_count ?? null,
    ambiguity_terms: Array.isArray(analysis?.ambiguity_terms)
      ? analysis.ambiguity_terms
      : [],
    score: analysis?.score ?? null,
    actor: analysis?.actor ?? null,
    action: analysis?.action ?? null,
    object: analysis?.object ?? null,
  };
}

function countWords(text = "") {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isLowSignalRequirement(text = "") {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();

  if (!normalized) {
    return true;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length <= 3) {
    return true;
  }

  const uniqueTokens = new Set(tokens);
  if (uniqueTokens.size <= 2 && tokens.length <= 6) {
    return true;
  }

  return false;
}

function sanitizeAssistantResponse(rawText = "") {
  return String(rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function appearsTruncated(text = "") {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }

  const words = countWords(value);
  if (words < 24) {
    return false;
  }

  // Most complete answers should end with terminal punctuation.
  if (/[.!?\]"')\u2026]$/.test(value)) {
    return false;
  }

  // Common signs of abrupt cutoff.
  return /(and|or|by|with|to|for|of|in|that|which|because|when|if|then|also|more)$/i.test(
    value,
  );
}

function buildDeterministicInitialReview({ requirement, analysis, draft }) {
  const clarity = analysis?.clarity ?? "N/A";
  const completeness = analysis?.completeness ?? "N/A";
  const consistency = analysis?.consistency ?? "N/A";
  const ambiguity = analysis?.ambiguity ?? "N/A";
  const score = analysis?.score ?? "N/A";
  const actor = String(analysis?.actor || "").trim();
  const action = String(analysis?.action || "").trim();
  const object = String(analysis?.object || "").trim();
  const ambiguityTerms = Array.isArray(analysis?.ambiguity_terms)
    ? analysis.ambiguity_terms.filter(Boolean).slice(0, 8)
    : [];

  const missingParts = [];
  if (!actor) missingParts.push("actor/owner");
  if (!action) missingParts.push("explicit action");
  if (!object) missingParts.push("target object/scope");

  const ambiguityLine = ambiguityTerms.length
    ? `Ambiguous terms currently present: ${ambiguityTerms.join(", ")}.`
    : "No specific ambiguous keyword was extracted, but wording still needs measurable constraints.";

  const rewriteCandidate = `The system shall ${action || "[specific action]"} for ${object || "[target object/scope]"} by ${actor || "[responsible role]"}, under [clear condition], within [measurable threshold], and validated by [acceptance criteria].`;

  return [
    draft ? String(draft).trim() : "",
    "Overall assessment:",
    `This requirement is understandable at a high level, but it still needs clearer boundaries and measurable language to reduce interpretation gaps across stakeholders. Current indicators suggest: clarity ${clarity}, completeness ${completeness}, consistency ${consistency}, ambiguity ${ambiguity}, and an overall score of ${score}.`,
    "",
    "Detailed analysis:",
    `1. Missing parts: ${missingParts.length ? missingParts.join(", ") : "none of the core actor/action/object parts are missing"}.`,
    "2. Measurability: Add explicit success criteria such as timing, limits, throughput, and acceptable error thresholds.",
    `3. Ambiguity reduction: ${ambiguityLine}`,
    "4. Consistency checks: Align this requirement with related business rules, roles, and non-functional constraints to avoid conflicts.",
    "",
    "Suggested rewrite:",
    rewriteCandidate,
    "",
    "Next actions:",
    "- Confirm business owner expectations for scope and measurable thresholds.",
    "- Define acceptance test cases before implementation.",
    "- Re-run quality review after rewriting to verify score improvements (especially clarity, completeness, and ambiguity).",
  ]
    .filter(Boolean)
    .join("\n");
}

function shouldAugmentInitialReview(text = "", analysis = {}) {
  const normalized = String(text || "").toLowerCase();

  const ambiguity = Number(analysis?.ambiguity ?? NaN);
  const highAmbiguity = Number.isFinite(ambiguity) && ambiguity >= 40;
  const lowScore =
    Number.isFinite(Number(analysis?.score)) && Number(analysis?.score) <= 40;

  const actor = String(analysis?.actor || "").trim();
  const action = String(analysis?.action || "").trim();
  const object = String(analysis?.object || "").trim();
  const missingCore = !actor || !action || !object;

  const mentionsAmbiguity = /(ambigu|mơ hồ|vague|không rõ|unclear)/i.test(
    normalized,
  );
  const deniesAmbiguity =
    /(no\s+ambigu|không\s+mơ\s*hồ|not\s+ambiguous|không\s+có\s+vấn\s+đề\s+mơ\s*hồ)/i.test(
      normalized,
    );
  const mentionsMissingParts =
    /(missing|thiếu|actor|action|object|scope|measur|threshold|acceptance)/i.test(
      normalized,
    );
  const mentionsRewrite =
    /(rewrite|re-write|viết lại|đề xuất|suggested rewrite|shall)/i.test(
      normalized,
    );
  const mentionsScoreImprovement =
    /(score\s*improv|improv\w*\s+score|increase\s+score|raise\s+score|nâng\s+điểm)/i.test(
      normalized,
    );

  if (highAmbiguity && !mentionsAmbiguity) {
    return true;
  }

  if (highAmbiguity && deniesAmbiguity) {
    return true;
  }

  if (missingCore && !mentionsMissingParts) {
    return true;
  }

  if (!mentionsRewrite) {
    return true;
  }

  // For clearly weak requirements, enforce score-improvement guidance.
  if ((highAmbiguity || lowScore) && !mentionsScoreImprovement) {
    return true;
  }

  return false;
}

function shouldOverrideInitialReview(text = "", analysis = {}) {
  const normalized = String(text || "").toLowerCase();
  const ambiguity = Number(analysis?.ambiguity ?? NaN);
  const highAmbiguity = Number.isFinite(ambiguity) && ambiguity >= 40;

  const claimsNoAmbiguity =
    /(no\s+ambigu|not\s+ambiguous|không\s+mơ\s*hồ|không\s+có\s+vấn\s+đề\s+mơ\s*hồ)/i.test(
      normalized,
    );

  const overPositiveSummary =
    /(clear,?\s*complete,?\s*consistent|meets\s+all\s+the\s+specified\s+criteria)/i.test(
      normalized,
    );

  return highAmbiguity && (claimsNoAmbiguity || overPositiveSummary);
}

function buildMessages({ requirement, analysis, history, question, mode }) {
  const safeMode = mode === "initial" ? "initial" : "followup";
  const analysisSummary = prettyJson(compactAnalysis(analysis));

  const systemMessage = [
    "You are a senior AI assistant for software requirement engineering.",
    "Be context-aware, natural, and conversational like a modern assistant.",
    "Reply in the same language as the user's latest message when possible.",
    "Do not invent project facts that are not in the provided context.",
    "IMPORTANT: Do not output raw JSON, metrics objects, or any structured data format in curly braces {}.",
    "IMPORTANT: When asked to rewrite or provide criteria, respond with natural language explanations only.",
    "IMPORTANT: Avoid markdown control symbols such as **, ---, and code fences unless explicitly requested.",
    "When user asks casual questions (hello/help), reply naturally and briefly.",
    "When user asks analysis/rewrite, provide practical and specific recommendations in prose.",
    "When reviewing requirements, always identify what is missing (actor/action/object/condition/measurement) and explain how to fix each gap.",
    "Ambiguity is a risk metric where lower is better; explicitly propose edits that reduce ambiguity.",
    safeMode === "initial"
      ? "For the first requirement review, provide a detailed response with: overall assessment, missing parts, ambiguity issues, concrete rewritten requirement, and next actions. Keep it substantial (roughly 140+ words) and specific to the selected requirement."
      : "For follow-up replies, stay concise but still specific.",
  ].join(" ");

  const contextMessage = [
    "Selected requirement:",
    requirement,
    "",
    "Latest analysis snapshot:",
    analysisSummary,
  ].join("\n");

  const normalizedHistory = (Array.isArray(history) ? history : [])
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content ?? item?.message ?? "").trim(),
    }))
    .filter((item) => item.content)
    .slice(-Math.max(2, Number(config.ollama.maxHistoryMessages || 6)));

  const fallbackQuestion =
    safeMode === "initial"
      ? "Please provide a detailed first-pass review for the selected requirement with sections: overall assessment, specific issues, rewrite suggestion, and actionable next steps. Keep it specific and substantial."
      : "Please continue helping with this requirement conversation.";

  const userQuestion = String(question || "").trim() || fallbackQuestion;

  return [
    { role: "system", content: systemMessage },
    { role: "system", content: contextMessage },
    ...normalizedHistory,
    { role: "user", content: userQuestion },
  ];
}

function selectChatProvider() {
  if (config.groq.enabled && config.groq.apiKey) {
    return "groq";
  }

  return "ollama";
}

function userExplicitlyWantsJson(question = "") {
  const q = String(question || "").toLowerCase();
  return /(\bjson\b|machine\s*readable|raw\s*output|dạng\s*json|xuất\s*json)/.test(
    q,
  );
}

function looksLikeJsonResponse(text = "") {
  const t = String(text || "").trim();
  if (!t) {
    return false;
  }

  // Check if response starts with JSON
  if (
    (t.startsWith("{") && t.includes(":")) ||
    (t.startsWith("[") && t.includes("{"))
  ) {
    return true;
  }

  // Check for embedded JSON (e.g., "Here is: {...}") - look for JSON-like patterns
  const jsonBlockPattern = /\n\s*\{[\s\S]*?:\s*[\s\S]*?\}/;
  const hasJsonBlock = jsonBlockPattern.test(t);

  // Look for metrics or analysis output patterns that indicate JSON-like structure
  const hasMetricsPattern =
    /["']?(clarity|completeness|consistency|ambiguity|score)["']?\s*[:=]/i.test(
      t,
    );

  return hasJsonBlock || hasMetricsPattern;
}

async function chatWithOllama(messages, mode = "followup", returnMeta = false) {
  const safeMode = mode === "initial" ? "initial" : "followup";
  const configuredMaxTokens = Math.max(
    64,
    Number(config.ollama.maxTokens || 256),
  );
  const numPredict =
    safeMode === "initial"
      ? Math.min(240, Math.max(128, configuredMaxTokens))
      : Math.min(192, Math.max(64, configuredMaxTokens));
  const baseTemperature = Number(config.ollama.temperature || 0.2);
  const effectiveTemperature =
    safeMode === "initial"
      ? Math.min(0.7, Math.max(0.25, baseTemperature + 0.12))
      : Math.min(0.6, Math.max(0.2, baseTemperature + 0.06));

  const response = await ollamaClient.post("/api/chat", {
    model: config.ollama.model,
    messages,
    stream: false,
    keep_alive: config.ollama.keepAlive,
    options: {
      num_predict: numPredict,
      temperature: effectiveTemperature,
      num_ctx: Math.max(1024, Number(config.ollama.contextWindow || 2048)),
    },
  });

  const text = String(response?.data?.message?.content || "").trim();
  if (!returnMeta) {
    return text;
  }

  return {
    text,
    doneReason: String(response?.data?.done_reason || "").toLowerCase(),
  };
}

async function chatWithGroq(messages, mode = "followup") {
  const safeMode = mode === "initial" ? "initial" : "followup";

  const response = await groqClient.post(
    "/chat/completions",
    {
      model: config.groq.model,
      messages,
      temperature: Number(config.groq.temperature || 0.3),
      max_tokens:
        safeMode === "initial"
          ? Math.max(420, Number(config.groq.maxTokens || 512))
          : Math.max(128, Number(config.groq.maxTokens || 512)),
    },
    {
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
    },
  );

  return String(response?.data?.choices?.[0]?.message?.content || "").trim();
}

async function rewriteJsonLikeResponse({
  provider,
  rawText,
  question,
  requirement,
}) {
  const rewriteMessages = [
    {
      role: "system",
      content:
        "Rewrite the assistant output into pure natural conversational text without any JSON, metrics, or structured data. Never output braces {}, brackets [], or colons with values.",
    },
    {
      role: "user",
      content: [
        "User request:",
        String(question || ""),
        "",
        "Selected requirement:",
        String(requirement || ""),
        "",
        "Assistant output to rewrite into natural language (remove all JSON/metrics):",
        String(rawText || ""),
      ].join("\n"),
    },
  ];

  if (provider === "groq") {
    return chatWithGroq(rewriteMessages, "followup");
  }

  return chatWithOllama(rewriteMessages, "followup");
}

async function expandShortInitialResponse({
  provider,
  requirement,
  analysis,
  shortDraft,
}) {
  const expandMessages = [
    {
      role: "system",
      content:
        "Expand the review into a detailed, specific, and readable requirement analysis. Avoid JSON and avoid markdown control symbols such as **, ---, and code fences.",
    },
    {
      role: "user",
      content: [
        "Selected requirement:",
        String(requirement || ""),
        "",
        "Analysis snapshot:",
        prettyJson(compactAnalysis(analysis || {})),
        "",
        "Current short draft to expand:",
        String(shortDraft || ""),
        "",
        "Rewrite this into a fuller first review with concrete observations and an improved requirement suggestion.",
      ].join("\n"),
    },
  ];

  if (provider === "groq") {
    return chatWithGroq(expandMessages, "initial");
  }

  return chatWithOllama(expandMessages, "initial");
}

async function continueTruncatedResponse({
  provider,
  requirement,
  analysis,
  partialResponse,
}) {
  const continueMessages = [
    {
      role: "system",
      content:
        "Continue the assistant response naturally from the last unfinished sentence. Do not repeat prior content. Do not output JSON or code fences.",
    },
    {
      role: "user",
      content: [
        "Selected requirement:",
        String(requirement || ""),
        "",
        "Analysis snapshot:",
        prettyJson(compactAnalysis(analysis || {})),
        "",
        "Partial response that ended abruptly:",
        String(partialResponse || ""),
        "",
        "Please continue only the missing ending in 2-4 concise paragraphs.",
      ].join("\n"),
    },
  ];

  if (provider === "groq") {
    return chatWithGroq(continueMessages, "followup");
  }

  return chatWithOllama(continueMessages, "followup");
}

async function chatWithAI({ requirement, analysis, history, question, mode }) {
  const safeRequirement = String(requirement || "").trim();
  if (!safeRequirement) {
    throw new AppError(400, "requirement is required for chatWithAI");
  }

  const safeMode = mode === "initial" ? "initial" : "followup";

  const ambiguityValue = Number(analysis?.ambiguity ?? NaN);
  const scoreValue = Number(analysis?.score ?? NaN);
  const actor = String(analysis?.actor || "").trim();
  const action = String(analysis?.action || "").trim();
  const object = String(analysis?.object || "").trim();
  const coreMissingCount = [actor, action, object].filter(
    (part) => !part,
  ).length;
  const lowSignalRequirement = isLowSignalRequirement(safeRequirement);

  const forceDeterministicInitialReview =
    safeMode === "initial" &&
    (lowSignalRequirement ||
      (Number.isFinite(ambiguityValue) &&
        ambiguityValue >= 85 &&
        Number.isFinite(scoreValue) &&
        scoreValue <= 20 &&
        coreMissingCount >= 2));

  if (forceDeterministicInitialReview) {
    return buildDeterministicInitialReview({
      requirement: safeRequirement,
      analysis,
      draft: "",
    });
  }

  const messages = buildMessages({
    requirement: safeRequirement,
    analysis: analysis || {},
    history: Array.isArray(history) ? history : [],
    question: question || "",
    mode: safeMode,
  });

  try {
    const provider = selectChatProvider();
    let text = "";
    let doneReason = "";

    if (provider === "groq") {
      text = await chatWithGroq(messages, safeMode);
    } else {
      const ollamaResult = await chatWithOllama(messages, safeMode, true);
      text = String(ollamaResult?.text || "");
      doneReason = String(ollamaResult?.doneReason || "");
    }

    if (!text) {
      throw new AppError(502, `${provider} returned empty content`);
    }

    if (looksLikeJsonResponse(text) && !userExplicitlyWantsJson(question)) {
      try {
        const rewritten = await rewriteJsonLikeResponse({
          provider,
          rawText: text,
          question,
          requirement: safeRequirement,
        });

        if (rewritten && !looksLikeJsonResponse(rewritten)) {
          text = rewritten;
        }
      } catch {
        // Keep original text if rewrite fails.
      }
    }

    // Keep initial response one-pass for speed; avoid second LLM call to "expand".
    // We only fall back to deterministic review later if needed.

    const likelyTokenCut =
      doneReason === "length" || doneReason === "max_tokens";
    if (safeMode === "followup" && (likelyTokenCut || appearsTruncated(text))) {
      try {
        const continuation = await continueTruncatedResponse({
          provider,
          requirement: safeRequirement,
          analysis,
          partialResponse: text,
        });

        if (continuation) {
          text = `${text}\n\n${continuation}`;
        }
      } catch {
        // Keep original text if continuation fails.
      }
    }

    text = sanitizeAssistantResponse(text);

    if (
      safeMode === "initial" &&
      forceDeterministicInitialReview &&
      countWords(text) < INITIAL_MIN_WORDS
    ) {
      text = buildDeterministicInitialReview({
        requirement: safeRequirement,
        analysis,
        draft: text,
      });
    }

    if (safeMode === "initial" && shouldOverrideInitialReview(text, analysis)) {
      text = buildDeterministicInitialReview({
        requirement: safeRequirement,
        analysis,
        draft: "",
      });
    }

    if (safeMode === "initial" && shouldAugmentInitialReview(text, analysis)) {
      if (forceDeterministicInitialReview) {
        text = buildDeterministicInitialReview({
          requirement: safeRequirement,
          analysis,
          draft: "",
        });
      }
    }

    return text;
  } catch (error) {
    throw new AppError(502, "Failed to call chat provider", {
      reason: error?.response?.data?.error || error.message,
    });
  }
}

async function warmupChatModel() {
  if (!config.ollama.warmupEnabled) {
    return false;
  }

  if (selectChatProvider() !== "ollama") {
    return false;
  }

  try {
    await ollamaClient.post("/api/chat", {
      model: config.ollama.model,
      messages: [
        {
          role: "user",
          content: "Give one short suggestion to improve requirement clarity.",
        },
      ],
      stream: false,
      keep_alive: config.ollama.keepAlive,
      options: {
        num_predict: 32,
        temperature: 0,
        num_ctx: Math.max(1024, Number(config.ollama.contextWindow || 1024)),
      },
    });

    return true;
  } catch {
    return false;
  }
}

module.exports = {
  analyzeText,
  chatWithAI,
  chatWithAi: chatWithAI,
  warmupChatModel,
};
