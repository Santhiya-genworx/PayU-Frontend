import type { InvoiceData } from "./invoice";
import type { POData } from "./purchase_order";

export interface Vendor {
  name: string;
  email: string;
  address: string;
  country_code: string;
  mobile_number: string;
  gst_number: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}

export type ExtractedFile =
  | {
      id: string;
      fileName: string;
      file: File;
      status: "extracting" | "done" | "error" | "uploading" | "uploaded" | "confirmation_required";
      type: "invoice";
      extractedData?: InvoiceData;
    }
  | {
      id: string;
      fileName: string;
      file: File;
      status: "extracting" | "done" | "error" | "uploading" | "uploaded";
      type: "po";
      extractedData?: POData;
    };

export interface FiledProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
}