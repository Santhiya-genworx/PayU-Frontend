import type { Vendor } from "./process";

export interface OrderedItem {
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface POData {
  po_id: string;
  gl_code: string;
  ordered_date: string; 
  currency_code: string;
  total_amount: number;
  vendor: Vendor;
  ordered_items: OrderedItem[];
}