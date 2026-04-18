import { apiClient } from "./apiClient";

export const chatService = {
  async sendMessage(sessionId, payload = {}) {
    const {
      message = "",
      mode = "followup",
      requirementId = null,
      requirementText = null,
    } = payload;

    const { data } = await apiClient.post("/chat", {
      session_id: sessionId,
      message,
      mode,
      requirement_id: requirementId,
      requirement_text: requirementText,
    });
    return data;
  },
};
