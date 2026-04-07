import api from "../../../lib/axios";

export const filterInvoices = async (search?: string) => {
  const response = await api.get("process/documents/invoices/filter", { params: { search }, withCredentials: true });
  return response.data;
};

// ── Fetch InvoiceMatching groups (new group-based schema) ────────────────────
export const getInvoiceMatchings = async (search?: string) => {
  const response = await api.get("process/documents/invoice-matchings", { params: { search }, withCredentials: true });
  return response.data;
};

export const filterPurchaseOrders = async (search?: string) => {
  const response = await api.get("process/documents/purchase-orders/filter", { params: { search }, withCredentials: true });
  return response.data;
};

export const getInvoiceStats = async () => {
  const response = await api.get("process/documents/invoice/stats", { withCredentials: true });
  return response.data;
};

export const getPurchaseOrderStats = async () => {
  const response = await api.get("process/documents/purchase-order/stats", { withCredentials: true });
  return response.data;
};

export const getInvoiceUploadHistory = async (invoice_id: string) => {
  const response = await api.get("process/invoice/history", { params: { invoice_id }, withCredentials: true });
  return response.data;
};

export const getPOUploadHistory = async (po_id: string) => {
  const response = await api.get("process/purchase-order/history", { params: { po_id }, withCredentials: true });
  return response.data;
};

export const getInvoiceDecision = async (invoice_id: string) => {
  const response = await api.get("process/invoice/decision", { params: { invoice_id }, withCredentials: true });
  return response.data;
};

// ── Invoice actions — now accept invoice_id (first in group) OR group_id ─────
// The backend resolves by looking up the matching group containing invoice_id.
export const approveInvoice = async (invoice_id: string) => {
  const response = await api.put("process/invoice/approve", { invoice_id }, { withCredentials: true });
  return response.data;
};

export const reviewInvoice = async (
  invoice_id: string,
  overrides?: { mail_to?: string; mail_subject?: string; mail_body?: string }
) => {
  const response = await api.put("process/invoice/review", { invoice_id, ...overrides }, { withCredentials: true });
  return response.data;
};

export const rejectInvoice = async (
  invoice_id: string,
  overrides?: { mail_to?: string; mail_subject?: string; mail_body?: string }
) => {
  const response = await api.put("process/invoice/reject", { invoice_id, ...overrides }, { withCredentials: true });
  return response.data;
};

// ── Manually trigger LLM validation for a matching group ─────────────────────
export const triggerGroupValidation = async (group_id: number, type: string = "new") => {
  const response = await api.post(`process/match/group/${group_id}`, null, {
    params: { type },
    withCredentials: true,
  });
  return response.data;
};