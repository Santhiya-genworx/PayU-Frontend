import type { Vendor } from "./process";

export interface InvoiceItem {
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InvoiceData {
  invoice_id: string;
  vendor: Vendor;
  po_id: string;
  invoice_date: string;
  due_date: string;
  invoice_items: InvoiceItem[];
  currency_code: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  file_url: string | null;
}