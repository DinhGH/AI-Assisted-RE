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
    score: analysis?.score ?? null,
    actor: analysis?.actor ?? null,
    action: analysis?.action ?? null,
    object: analysis?.object ?? null,
  };
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
    "When user asks casual questions (hello/help), reply naturally and briefly.",
    "When user asks analysis/rewrite, provide practical and specific recommendations in prose.",
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
      ? "Please review this selected requirement. Summarize quality, identify key issues, and suggest an improved version."
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

async function chatWithOllama(messages) {
  const response = await ollamaClient.post("/api/chat", {
    model: config.ollama.model,
    messages,
    stream: false,
    keep_alive: config.ollama.keepAlive,
    options: {
      num_predict: Math.max(64, Number(config.ollama.maxTokens || 220)),
      temperature: Number(config.ollama.temperature || 0.3),
      num_ctx: Math.max(1024, Number(config.ollama.contextWindow || 2048)),
    },
  });

  return String(response?.data?.message?.content || "").trim();
}

async function chatWithGroq(messages) {
  const response = await groqClient.post(
    "/chat/completions",
    {
      model: config.groq.model,
      messages,
      temperature: Number(config.groq.temperature || 0.3),
      max_tokens: Math.max(128, Number(config.groq.maxTokens || 512)),
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
    return chatWithGroq(rewriteMessages);
  }

  return chatWithOllama(rewriteMessages);
}

async function chatWithAI({ requirement, analysis, history, question, mode }) {
  const safeRequirement = String(requirement || "").trim();
  if (!safeRequirement) {
    throw new AppError(400, "requirement is required for chatWithAI");
  }

  const messages = buildMessages({
    requirement: safeRequirement,
    analysis: analysis || {},
    history: Array.isArray(history) ? history : [],
    question: question || "",
    mode,
  });

  try {
    const provider = selectChatProvider();
    let text =
      provider === "groq"
        ? await chatWithGroq(messages)
        : await chatWithOllama(messages);

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
