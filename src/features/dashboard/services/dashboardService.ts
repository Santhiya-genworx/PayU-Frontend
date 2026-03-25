import api from "../../../lib/axios";
import type { InvoiceData } from "../../../types/invoice";
import type { POData } from "../../../types/purchase_order";
import type { AxiosError } from "axios";

export const createUser = async (data: { name: string; email: string; password: string; role: "associate" | "manager" }) => {
  const response = await api.post("/auth/users/create", data, { withCredentials: true });
  return response.data;
};

export const extractInvoice = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ file_id: string }>("/process/extract/invoice", formData, { withCredentials: true });
  return response.data.file_id;
};

export const extractPurchaseOrder = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ file_id: string }>("/process/extract/purchase-order", formData, { withCredentials: true });
  return response.data.file_id;
};

// ── Typed shapes for extraction polling ──────────────────────────────────────
type ExtractionStatus = "processing" | "completed" | "failed";

interface ExtractionStatusResponse {
  status: ExtractionStatus;
  result?: unknown;
  error?: string;
}

export const pollExtractionStatus = async (
  fileId: string,
  onProgress: (status: ExtractionStatus, result?: unknown, error?: string) => void,
  intervalMs = 3000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const response = await api.get<ExtractionStatusResponse>(`/process/extract/status/${fileId}`, { withCredentials: true });
        const data = response.data;
        onProgress(data.status, data.result, data.error);
        if (data.status === "processing") setTimeout(check, intervalMs);
        else resolve();
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ detail?: string }>;
        const message = axiosErr?.response?.data?.detail ?? axiosErr?.message ?? "Status check failed";
        onProgress("failed", undefined, message);
        reject(err);
      }
    };
    check();
  });
};

export const getDocumentCounts = async (): Promise<{
  total: number; approved: number; pending: number; reviewed: number; rejected: number;
}> => {
  const response = await api.get("/process/document-counts", { withCredentials: true });
  return response.data;
};

export const getRecentActivity = async () => {
  const response = await api.get("/process/recent-activity", { withCredentials: true });
  return response.data;
};

// ── Helper: convert InvoiceData.po_id (display string) → List[str] ────────────
// The form stores po_id as a comma-separated string: "PO-001, PO-002"
// The backend InvoiceRequest.po_id expects List[str]: ["PO-001", "PO-002"]
function buildInvoicePayload(data: InvoiceData): object {
  let poList: string[] = [];

  if (Array.isArray(data.po_id)) {
    poList = data.po_id.filter(Boolean);
  } else if (typeof data.po_id === "string") {
    poList = data.po_id.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return {
    ...data,
    po_id: poList,
  };
}

export const submitInvoice = async (data: InvoiceData, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(buildInvoicePayload(data)));
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

export const pollUploadStatus = async (fileId: string): Promise<{ status: string; error?: string }> => {
  const response = await api.get<{ status: string; error?: string }>(`/process/upload/status/${fileId}`, { withCredentials: true });
  return response.data;
};

export const overrideInvoice = async (data: InvoiceData, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(buildInvoicePayload(data)));
  const response = await api.put("/process/upload/invoice/override", formData, { withCredentials: true });
  return response.data;
};

export const overridePurchaseOrder = async (data: POData, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(data));
  const response = await api.put("/process/upload/purchase-order/override", formData, { withCredentials: true });
  return response.data;
};

// ── Chart / dashboard stats ───────────────────────────────────────────────────
export const getMonthlyVolumeData = async () => {
  const response = await api.get("/process/stats/monthly-volume", { withCredentials: true });
  return response.data;
};

export const getMonthlyAmountData = async () => {
  const response = await api.get("/process/stats/monthly-amount", { withCredentials: true });
  return response.data;
};

export const getQuickStats = async () => {
  const response = await api.get("/process/stats/quick", { withCredentials: true });
  return response.data;
};