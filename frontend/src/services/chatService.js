import { apiClient } from "./apiClient";

export const chatService = {
  async sendMessage(sessionId, message) {
    const { data } = await apiClient.post("/chat", {
      session_id: sessionId,
      message,
    });
    return data;
  },
};
