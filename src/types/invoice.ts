import type { Vendor } from "./process";

export interface InvoiceItem {
  item_description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
}

export interface InvoiceDetail {
  invoice_id:    string;
  invoice_date:  string;
  due_date:      string;
  total_amount:  number;
  subtotal:      number;
  tax_amount:    number;
  currency_code: string;
  vendor?: {
    name:          string;
    email:         string;
    mobile_number: string;
    address:       string;
  } | null;
}

export interface PODetail {
  po_id:        string;
  total_amount: number;
  currency_code: string;
  status:       string;
  ordered_date: string;
}

export interface InvoiceData {
  group_id?:   number;       
  invoice_ids?: string[];    
  po_ids?:      string[];    

  invoices?:   InvoiceDetail[]; 
  pos?:        PODetail[];      

  is_po_matched: boolean | null;

  matching_status?:  "pending" | "approved" | "reviewed" | "rejected";
  decision?:         "approve" | "review" | "reject" | null;
  confidence_score?: number | null;
  command?:          string | null;
  mail_to?:          string | null;
  mail_subject?:     string | null;
  mail_body?:        string | null;

  invoice_id?:     string;
  vendor?:         Vendor;
  po_id?:          string | null;  
  invoice_date?:   string;
  due_date?:       string;
  invoice_items?:  InvoiceItem[];
  currency_code?:  string;
  subtotal?:       number;
  tax_amount?:     number;
  discount_amount?: number;
  total_amount?:   number;
  file_url?:       string;
  status?:         "approved" | "pending" | "rejected" | "reviewed";
}

export function primaryInvoice(data: InvoiceData): InvoiceDetail | null {
  return data.invoices?.[0] ?? null;
}

/** Representative invoice_id for a group (first, or legacy single field) */
export function groupInvoiceId(data: InvoiceData): string {
  return data.invoice_ids?.[0] ?? data.invoice_id ?? "";
}

/** Representative amount for a group (sum across all invoices) */
export function groupTotalAmount(data: InvoiceData): number {
  if (data.invoices && data.invoices.length > 0) {
    return data.invoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
  }
  return data.total_amount ?? 0;
}

/** Representative currency for a group (first invoice's currency) */
export function groupCurrencyCode(data: InvoiceData): string {
  return data.invoices?.[0]?.currency_code ?? data.currency_code ?? "INR";
}

/** Representative date for a group (first invoice's date) */
export function groupInvoiceDate(data: InvoiceData): string {
  return data.invoices?.[0]?.invoice_date ?? data.invoice_date ?? "";
}

/** Representative vendor for a group (first invoice's vendor) */
export function groupVendorName(data: InvoiceData): string {
  return data.invoices?.[0]?.vendor?.name ?? data.vendor?.name ?? "";
}

/** Display label for po_ids array */
export function groupPoLabel(data: InvoiceData): string {
  if (data.po_ids && data.po_ids.length > 0) return data.po_ids.join(", ");
  if (data.po_id) return data.po_id;
  return "";
}

export interface Decision {
  status:           "approve" | "review" | "reject";
  confidence_score: number;
  command:          string;
  mail_to?:         string;
  mail_subject?:    string;
  mail_body?:       string;
}