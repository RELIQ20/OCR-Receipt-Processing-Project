export interface ReceiptItemPayload {
  description: string;
  price: number;
}

export interface ReceiptEntryPayload {
  merchant_name: string;
  date: string;
  time?: string;
  total_amount: number;
  currency: string;
  drive_link?: string;
  items: ReceiptItemPayload[];
}

export interface ReceiptMessagePayload {
  id: string;
  sender_name: string;
  status: string;
  source: string;
  receipts: ReceiptEntryPayload[];
  grand_total: number;
  excel_link?: string;
  createdAt: string;
  updatedAt?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data?.error || data?.details || message;
    } catch {
      // Ignore JSON parse issues and fall back to default message.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchReceipts(): Promise<ReceiptMessagePayload[]> {
  const response = await fetch("/api/receipts");
  return handleResponse<ReceiptMessagePayload[]>(response);
}

export async function getReceiptSummary(sender: string): Promise<ReceiptMessagePayload[]> {
  const response = await fetch(`/api/receipts?sender=${encodeURIComponent(sender)}`);
  return handleResponse<ReceiptMessagePayload[]>(response);
}

export async function getServerIp(): Promise<{ ip: string; port: number }> {
  const response = await fetch("/api/ip");
  return response.json();
}

export async function createReceipt(receipt: Omit<ReceiptMessagePayload, "id" | "createdAt">): Promise<ReceiptMessagePayload> {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
  });

  return handleResponse<ReceiptMessagePayload>(response);
}

export async function updateReceipt(id: string, updates: Partial<ReceiptMessagePayload>): Promise<ReceiptMessagePayload> {
  const response = await fetch(`/api/receipts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  return handleResponse<ReceiptMessagePayload>(response);
}

export async function deleteReceipt(id: string): Promise<void> {
  const response = await fetch(`/api/receipts/${id}`, {
    method: "DELETE",
  });

  await handleResponse<{ ok: boolean }>(response);
}
