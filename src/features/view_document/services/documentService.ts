import api from "../../../lib/axios";

export const getInvoices = async () => {
  const response = await api.get("process/view-documents/invoices", { withCredentials: true });
  return response.data;
};

export const getPurchaseOrders = async () => {
  const response = await api.get("process/view-documents/purchase-orders", { withCredentials: true });
  return response.data;
};

export const getDocumentStats = async () => {
  const res = await api.get("process/documents/stats", { withCredentials: true });
  return res.data;
};