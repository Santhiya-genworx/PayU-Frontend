import api from "../../../lib/axios";

export const filterInvoices = async (search? : string) => {
  const response = await api.get("process/documents/invoices/filter", { params: { search: search },withCredentials: true });
  console.log("URL:", response.request.responseURL);
  return response.data;
};

export const filterPurchaseOrders = async (search? : string) => {
  const response = await api.get("process/documents/purchase-orders/filter", { params: { search: search }, withCredentials: true });
  return response.data;
};

export const getDocumentStats = async () => {
  const response = await api.get("process/documents/stats", { withCredentials: true });
  return response.data;
};

export const getInvoiceUploadHistory = async (invoice_id: string) => {
  const response = await api.get("process/invoice/history", { params : {invoice_id}, withCredentials: true });
  return response.data;
}

export const getPOUploadHistory = async (po_id: string) => {
  const response = await api.get("process/purchase-order/history", { params : {po_id}, withCredentials: true });
  return response.data;
}
