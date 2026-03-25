




import type { Vendor } from "./process";

export interface InvoiceItem {
  item_description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
}

export interface InvoiceData {
  // ── Core invoice fields — used by ALL consumers unchanged ──────────────────
  invoice_id:      string;
  vendor:          Vendor;
  po_id?:          string | null;   // null possible when matching row has no PO
  is_po_matched:   boolean;
  invoice_date:    string;
  due_date:        string;
  invoice_items:   InvoiceItem[];
  currency_code:   string;
  subtotal:        number;
  tax_amount:      number;
  discount_amount: number;
  total_amount:    number;
  file_url?:       string;

  // Optional — kept for filterInvoices() responses and invoice_preview form.
  // invoice_preview sets status:"pending" in emptyForm and reads raw.status on
  // populate — both still compile correctly with optional.
  // associate_dashboard and view_document never read this field from API data.
  status?: "approved" | "pending" | "rejected" | "reviewed";

  // ── InvoiceMatching fields — optional ─────────────────────────────────────
  // Populated only by getInvoiceMatchings() on the Invoices page.
  // Every dashboard consumer (associate_dashboard, invoice_preview,
  // admin_dashboard, status_tab) uses filterInvoices() and leaves these
  // undefined — no breakage.
  matching_status?:  "pending" | "approved" | "reviewed" | "rejected";
  decision?:         "approve" | "review" | "reject" | null;
  confidence_score?: number | null;
  command?:          string | null;
  mail_to?:          string | null;
  mail_subject?:     string | null;
  mail_body?:        string | null;
}

export interface Decision {
  status:           "approve" | "review" | "reject";
  confidence_score: number;
  command:          string;
  mail_to?:         string;
  mail_subject?:    string;
  mail_body?:       string;
}