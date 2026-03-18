import type { Vendor } from "./process";

export interface InvoiceItem {
  item_description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
}

export interface InvoiceData {
  invoice_id: string;
  vendor: Vendor;
  po_id?: string;
  is_po_matched: boolean;
  invoice_date: string;
  due_date: string;
  invoice_items: InvoiceItem[];
  currency_code: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  file_url?: string;
  status: "approved" | "pending" | "rejected" | "reviewed"
}

export interface Decision {
  status: "approve" | "review" | "reject";
  confidence_score: number;
  command: string;
  mail_to?: string;
  mail_subject?: string;
  mail_body?: string;
}