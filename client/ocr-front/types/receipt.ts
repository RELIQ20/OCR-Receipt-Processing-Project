export type Status = "completed" | "for_review" | "processing";

export type EditState = { vendor: string; items: LineItem[]; total: number; tax: number; date: string; time: string; };

export interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  id: string;
  receiptImage?: string;
  vendor: string;
  items: LineItem[];
  total: number;
  tax: number;
  date: string;
  time: string;
  status: Status;
  confidence: number; // Confidence level (percentage) for the OCR extraction
}