import api from "../../../lib/axios";
import type { InvoiceData } from "../../../types/invoice";
import type { POData } from "../../../types/purchase_order";

export const extractInvoice = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/process/extract/invoice", formData, { withCredentials: true });
  return response.data.file_id; // returns file_id for polling
};

export const extractPurchaseOrder = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/process/extract/purchase-order", formData, { withCredentials: true });
  return response.data.file_id; // returns file_id for polling
};

export const pollExtractionStatus = async (
  fileId: string,
  onProgress: (status: "processing" | "completed" | "failed", result?: any, error?: string) => void,
  intervalMs = 3000,
  timeoutMs = 120000
): Promise<void> => {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        if (Date.now() - start > timeoutMs) {
          onProgress("failed", undefined, "Extraction timed out");
          reject(new Error("Extraction timed out"));
          return;
        }

        const response = await api.get(`/process/extract/status/${fileId}`, { withCredentials: true });
        const data = response.data;

        onProgress(data.status, data.result, data.error);

        if (data.status === "processing") {
          setTimeout(check, intervalMs); // keep polling
        } else {
          resolve(); // completed or failed — stop
        }
      } catch (err: any) {
        const message = err?.response?.data?.detail ?? err?.message ?? "Status check failed";
        onProgress("failed", undefined, message);
        reject(err);
      }
    };

    check();
  });
};

export const getTotalDocuments = async () => {
  const response = await api.get("/process/total-documents", { withCredentials: true });
  return response.data;
};

export const getApprovedDocuments = async () => {
  const response = await api.get("/process/approved-documents", { withCredentials: true });
  return response.data;
};

export const getReviewedDocuments = async () => {
  const response = await api.get("/process/reviewed-documents", { withCredentials: true });
  return response.data;
};

export const getRejectedDocuments = async () => {
  const response = await api.get("/process/rejected-documents", { withCredentials: true });
  return response.data;
};

export const getRecentActivity = async () => {
  const response = await api.get("/process/recent-activity", { withCredentials: true });
  return response.data;
};

export const submitInvoice = async (data: InvoiceData, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(data));

  const response = await api.post("/process/upload/invoice", formData, { withCredentials: true });
  return response.data;
};

export const submitPurchaseOrder = async (data: POData, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(data));

  const response = await api.post("/process/upload/purchase-order", formData, { withCredentials: true });
  return response.data;
};

// Poll upload job status (same pattern as extraction polling)
export const pollUploadStatus = async (
  fileId: string
): Promise<{ status: string; error?: string }> => {
  const response = await api.get(`/process/upload/status/${fileId}`, { withCredentials: true });
  return response.data;
};