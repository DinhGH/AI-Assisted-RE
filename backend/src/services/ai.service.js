const axios = require("axios");
const config = require("../config");
const { AppError } = require("../middlewares/error.middleware");

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

function hasTerminalEnding(text = "") {
  return /[.!?\]"')\u2026]$/.test(String(text || "").trim());
}

function appearsTruncated(text = "") {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }

  const words = countWords(value);
  if (words < 10) {
    return false;
  }

  // Most complete answers should end with terminal punctuation.
  if (hasTerminalEnding(value)) {
    return false;
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines[lines.length - 1] || value;

  // Very common hard-cut signals in lists and sectioned outputs.
  if (/^\d+\.\s+.+$/i.test(lastLine) && !/[.!?\]"')\u2026:]$/.test(lastLine)) {
    const itemBody = lastLine.replace(/^\d+\.\s+/, "");
    if (countWords(itemBody) <= 12) {
      return true;
    }
  }

  if (/^[-•]\s+.+$/i.test(lastLine) && !/[.!?\]"')\u2026:]$/.test(lastLine)) {
    const itemBody = lastLine.replace(/^[-•]\s+/, "");
    if (countWords(itemBody) <= 12) {
      return true;
    }
  }

  // Common signs of abrupt cutoff.
  return /(and|or|by|with|to|for|of|in|that|which|because|when|if|then|also|more|including|involved|implement|support|feedback)$/i.test(
    lastLine,
  );
}

function extractSuggestedRewrite(text = "") {
  const normalized = sanitizeAssistantResponse(text);
  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const headingIndex = lines.findIndex((line) =>
    /^suggested\s+rewrite\s*:/i.test(line),
  );

  if (headingIndex < 0) {
    return "";
  }

  const headingLine = lines[headingIndex] || "";
  const sameLine = headingLine
    .replace(/^suggested\s+rewrite\s*:\s*/i, "")
    .trim();
  if (sameLine) {
    return sameLine;
  }

  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }

    if (/^review\s*:/i.test(line)) {
      break;
    }

    const candidate = line.replace(/^[-•]\s+/, "").trim();
    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function toSingleSentence(text = "") {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) {
    return "";
  }

  const match = value.match(/^(.+?[.!?])(?:\s|$)/);
  if (match?.[1]) {
    return match[1].trim();
  }

  return value;
}

function fallbackRewriteFromAnalysis(analysis = {}) {
  const actor = String(analysis?.actor || "the responsible actor").trim();
  const action = String(
    analysis?.action || "perform the required action",
  ).trim();
  const object = String(analysis?.object || "the target object").trim();

  return `The system shall ${action} on ${object} for ${actor} when the specified condition is met and within measurable criteria.`;
}

function normalizeInitialReviewMessage(text = "", rewrite = "") {
  const normalized = sanitizeAssistantResponse(text);
  const lines = normalized.split("\n").map((line) => line.trim());
  let reviewLines = [];

  let inReview = false;
  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (/^review\s*:/i.test(line)) {
      inReview = true;
      continue;
    }

    if (/^suggested\s+rewrite\s*:/i.test(line)) {
      inReview = false;
      continue;
    }

    if (inReview) {
      const bullet = line.replace(/^[-•]\s*/, "").trim();
      if (bullet) {
        reviewLines.push(bullet);
      }
    }
  }

  const parsedBullets = [];

  for (let i = 0; i < reviewLines.length; i++) {
    let line = reviewLines[i].trim();

    // 🔥 STEP 1: remove "Issue" prefix ở mọi dạng
    line = line.replace(/^issue\s*:?\s*/i, "").trim();

    // 🔥 STEP 2: nếu dòng chỉ là tiêu đề rỗng → skip
    if (!line) continue;

    // 🔥 STEP 3: nếu dòng tiếp theo là description
    if (!line.includes("-") && !line.includes(":")) {
      const next = (reviewLines[i + 1] || "").trim();

      if (next) {
        const cleanNext = next.replace(/^issue\s*:?\s*/i, "").trim();

        // gộp title + desc
        parsedBullets.push(`${line}\n  ${cleanNext.replace(/[.!?]+$/, "")}.`);

        i++;
        continue;
      }
    }

    // 🔥 STEP 4: xử lý "Title - desc"
    if (line.includes("-")) {
      const [title, ...rest] = line.split("-");
      const desc = rest.join("-").trim();

      parsedBullets.push(`${title.trim()}\n  ${desc.replace(/[.!?]+$/, "")}.`);
      continue;
    }

    // 🔥 STEP 5: xử lý "Title: desc"
    if (line.includes(":")) {
      const [title, ...rest] = line.split(":");
      const desc = rest.join(":").trim();

      parsedBullets.push(`${title.trim()}\n  ${desc.replace(/[.!?]+$/, "")}.`);
      continue;
    }

    // 🔥 STEP 6: fallback đẹp hơn
    parsedBullets.push(`General Issue\n  ${line.replace(/[.!?]+$/, "")}.`);
  }

  reviewLines = parsedBullets;

  const professionalFallbackBullets = [
    "Missing actor: The requirement does not clearly specify which system component or user is responsible for the action.",
    "Lack of measurable criteria: There are no quantifiable limits such as response time, throughput, or performance thresholds.",
    "Ambiguity: Terms such as support or handle are vague and can lead to inconsistent implementation decisions.",
    "Missing condition: The requirement does not define under which system state or trigger this behavior must occur.",
    "Verification gap: The requirement does not provide concrete acceptance criteria for objective validation.",
  ];

  if (reviewLines.length < 3) {
    for (const fallback of professionalFallbackBullets) {
      if (!reviewLines.includes(fallback)) {
        reviewLines.push(fallback);
      }

      if (reviewLines.length >= 3) {
        break;
      }
    }
  }

  reviewLines = reviewLines.slice(0, 5);

  return [
    "Review:",
    ...reviewLines.map((line) => `- ${line}`),
    "",
    "Suggested Rewrite:",
    rewrite,
  ].join("\n");
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
      ? [
          "STRICT FORMAT REQUIRED.",
          "Return EXACTLY two sections in this order:",
          "Review:",
          "- provide 3 to 5 professional bullet points.",
          "Each bullet must start with a short professional issue title (2–5 words), followed by one sentence explanation.",
          "- each bullet must contain the name of the issue (not the word 'Issue') + one-sentence explanation.",
          "DO NOT use the words 'Issue' or 'Explanation' as labels.",
          "- do not repeat or paraphrase the original requirement text.",
          "- avoid generic statements; give concrete quality gaps.",
          "Suggested Rewrite:",
          "- ONE sentence only.",
          "The rewrite sentence must include actor, action, object, condition, and measurable criteria.",
          "Do not add any other headings or sections.",
        ].join(" ")
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
      ? "Please provide an initial requirement review using EXACTLY two sections: Review and Suggested Rewrite. In Review, provide 3 to 5 professional bullets where each bullet has Issue + one-sentence explanation, without repeating the original requirement and without generic statements. In Suggested Rewrite, provide exactly one sentence including actor, action, object, condition, and measurable criteria."
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

function isContinueIntent(question = "") {
  const q = String(question || "")
    .trim()
    .toLowerCase();
  if (!q) {
    return false;
  }

  return /^(continue|cont|go on|go ahead|keep going|more|tiếp|tiếp đi|tiếp tục|viết tiếp|nói tiếp|tiếp theo)\.?$/.test(
    q,
  );
}

function buildContinueQuestionFromHistory(history = []) {
  const safeHistory = Array.isArray(history) ? history : [];
  const lastAssistantMessage = [...safeHistory]
    .reverse()
    .find(
      (item) =>
        item?.role === "assistant" && String(item?.content || "").trim(),
    );

  if (!lastAssistantMessage) {
    return "Please continue your previous response from the exact point where it stopped. Do not restart from the beginning.";
  }

  const fullPrevious = String(lastAssistantMessage.content || "").trim();
  const previousTail = fullPrevious.slice(-1800);

  return [
    "User asked to continue your previous answer.",
    "Continue from the exact unfinished point of your previous assistant response.",
    "Do not repeat content that was already sent.",
    "If a numbered/bullet list was interrupted, continue and finish that list.",
    "",
    "Previous assistant response tail:",
    previousTail,
    "",
    "Output only the missing continuation.",
  ].join("\n");
}

async function chatWithOllama(messages, mode = "followup", returnMeta = false) {
  const safeMode = mode === "initial" ? "initial" : "followup";
  const configuredMaxTokens = Math.max(
    64,
    Number(config.ollama.maxTokens || 256),
  );
  const numPredict =
    safeMode === "initial"
      ? Math.min(900, Math.max(420, configuredMaxTokens))
      : Math.min(640, Math.max(280, configuredMaxTokens));
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
        "Continue the assistant response naturally from the exact unfinished point. Do not repeat prior content. Keep the same style and section structure. If it was a numbered or bullet list, continue and complete that list. Do not output JSON or code fences.",
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
        "Please continue only the missing ending and finish the response cleanly.",
      ].join("\n"),
    },
  ];

  if (provider === "groq") {
    return chatWithGroq(continueMessages, "followup");
  }

  return chatWithOllama(continueMessages, "followup");
}

async function completeResponseFromScratch({
  provider,
  requirement,
  analysis,
  partialResponse,
  mode,
}) {
  const safeMode = mode === "initial" ? "initial" : "followup";

  const completionMessages = [
    {
      role: "system",
      content:
        "Rewrite the assistant response into a complete final answer. Keep the same intent and structure, but ensure every section and sentence is fully completed. Do not output JSON or code fences.",
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
        "Current partial/truncated answer:",
        String(partialResponse || ""),
        "",
        "Please provide a complete final version without cutting off any section.",
      ].join("\n"),
    },
  ];

  if (provider === "groq") {
    return chatWithGroq(completionMessages, safeMode);
  }

  return chatWithOllama(completionMessages, "initial");
}

async function chatWithAI({ requirement, analysis, history, question, mode }) {
  const safeRequirement = String(requirement || "").trim();
  if (!safeRequirement) {
    throw new AppError(400, "requirement is required for chatWithAI");
  }

  const safeMode = mode === "initial" ? "initial" : "followup";
  let initialRequirementAnalysis = analysis || {};
  if (safeMode === "initial") {
    try {
      const analyzed = await analyzeText(safeRequirement);
      if (analyzed && typeof analyzed === "object") {
        initialRequirementAnalysis = analyzed;
      }
    } catch {
      // Keep provided analysis snapshot if analyze endpoint is temporarily unavailable.
    }
  }

  const normalizedHistory = Array.isArray(history) ? history : [];
  const continuationByUser =
    safeMode === "followup" && isContinueIntent(question);
  const effectiveQuestion = continuationByUser
    ? buildContinueQuestionFromHistory(normalizedHistory)
    : question || "";

  const messages = buildMessages({
    requirement: safeRequirement,
    analysis: analysis || {},
    history: normalizedHistory,
    question: effectiveQuestion,
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
    const suspiciousLongNoEnding =
      countWords(text) >= 45 && !hasTerminalEnding(text);

    let needsRecovery =
      likelyTokenCut || appearsTruncated(text) || suspiciousLongNoEnding;

    if (needsRecovery) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const continuation = await continueTruncatedResponse({
            provider,
            requirement: safeRequirement,
            analysis,
            partialResponse: text,
          });

          const cleanContinuation = String(continuation || "").trim();
          if (!cleanContinuation) {
            break;
          }

          const nextText = `${text}\n\n${cleanContinuation}`.trim();
          if (nextText.length <= text.length) {
            break;
          }

          text = nextText;

          const stillSuspicious =
            appearsTruncated(text) ||
            (countWords(text) >= 45 && !hasTerminalEnding(text));

          if (!stillSuspicious) {
            needsRecovery = false;
            break;
          }
        } catch {
          break;
        }
      }
    }

    if (needsRecovery && (appearsTruncated(text) || !hasTerminalEnding(text))) {
      try {
        const completed = await completeResponseFromScratch({
          provider,
          requirement: safeRequirement,
          analysis,
          partialResponse: text,
          mode: safeMode,
        });

        if (
          completed &&
          countWords(completed) >= Math.max(14, countWords(text) - 8)
        ) {
          text = completed;
        }
      } catch {
        // Keep best-effort response if completion pass fails.
      }
    }

    text = sanitizeAssistantResponse(text);

    if (safeMode === "initial") {
      let rewrite = extractSuggestedRewrite(text);
      if (!rewrite) {
        rewrite = fallbackRewriteFromAnalysis(initialRequirementAnalysis);
      }

      rewrite = toSingleSentence(rewrite);

      if (!hasTerminalEnding(rewrite)) {
        rewrite = `${rewrite}.`;
      }

      const message = normalizeInitialReviewMessage(text, rewrite);

      return {
        message,
        rewrite,
        analysis:
          initialRequirementAnalysis &&
          typeof initialRequirementAnalysis === "object"
            ? initialRequirementAnalysis
            : {},
      };
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
