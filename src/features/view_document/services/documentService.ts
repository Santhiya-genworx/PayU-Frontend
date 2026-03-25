import api from "../../../lib/axios";

export const filterInvoices = async (search?: string) => {
  const response = await api.get("process/documents/invoices/filter", { params: { search }, withCredentials: true });
  return response.data;
};

// ── NEW: fetch InvoiceMatching rows (decision + status embedded) ──────────────
// Returns list of InvoiceMatching joined with invoice data.
// Each row has: invoice_id, po_id, is_po_matched, status (MatchingStatus),
// decision (DecisionStatus), confidence_score, command, mail_to, mail_subject,
// mail_body, plus invoice fields (vendor, invoice_items, dates, amounts etc.)
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

export const approveInvoice = async (invoice_id: string) => {
  const response = await api.put("process/invoice/approve", { invoice_id }, { withCredentials: true });
  return response.data;
};

export const reviewInvoice = async (invoice_id: string, overrides?: { mail_to?: string; mail_subject?: string; mail_body?: string }) => {
  const response = await api.put("process/invoice/review", { invoice_id, ...overrides }, { withCredentials: true });
  return response.data;
};

export const rejectInvoice = async (invoice_id: string, overrides?: { mail_to?: string; mail_subject?: string; mail_body?: string }) => {
  const response = await api.put("process/invoice/reject", { invoice_id, ...overrides }, { withCredentials: true });
  return response.data;
};