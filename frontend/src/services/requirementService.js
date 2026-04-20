import { apiClient } from "./apiClient";

export const requirementService = {
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data;
  },

  async segmentDocument(documentId) {
    const { data } = await apiClient.post("/requirements/segment", {
      document_id: documentId,
    });
    return data;
  },

  async getRequirements(documentId) {
    const { data } = await apiClient.get("/requirements", {
      params: documentId ? { document_id: documentId } : undefined,
    });
    return data.requirements || [];
  },

  async createRequirement({ text, documentId, requirementCode }) {
    const { data } = await apiClient.post("/requirements", {
      text,
      document_id: documentId,
      requirement_code: requirementCode,
    });
    return data;
  },

  async deleteRequirement(requirementId) {
    const { data } = await apiClient.delete(`/requirements/${requirementId}`);
    return data;
  },

  async updateRequirement(requirementId, text, changedBy = "user") {
    const { data } = await apiClient.put(`/requirements/${requirementId}`, {
      text,
      changed_by: changedBy,
    });
    return data;
  },

  async reEvaluateRequirement(requirementId, text, changedBy = "user") {
    const { data } = await apiClient.post("/requirements/re-evaluate", {
      requirement_id: requirementId,
      text,
      changed_by: changedBy,
    });
    return data;
  },

  async getQueueStats() {
    const { data } = await apiClient.get("/queue/stats");
    return data;
  },

  async getMetrics() {
    const { data } = await apiClient.get("/metrics");
    return data;
  },

  getExportPdfUrl(documentId) {
    return `${apiClient.defaults.baseURL}/export/pdf${documentId ? `?document_id=${documentId}` : ""}`;
  },
};
