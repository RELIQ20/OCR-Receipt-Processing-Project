export interface LineItemPayload {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptPayload {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  status: string;
  auto: boolean;
  paymentMethod: string;
  paymentType: "cash" | "online";
  source: "upload" | "camera" | "email";
  accountLast4: string;
  contactNumber: string;
  imagePreview?: string;
  lineItems: LineItemPayload[];
  timeline: { label: string; time: string; done: boolean }[];
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

export async function fetchReceipts(): Promise<ReceiptPayload[]> {
  const response = await fetch("/api/receipts");
  return handleResponse<ReceiptPayload[]>(response);
}

export async function createReceipt(receipt: ReceiptPayload): Promise<ReceiptPayload> {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
  });

  return handleResponse<ReceiptPayload>(response);
}

export async function updateReceipt(id: string, updates: Partial<ReceiptPayload>): Promise<ReceiptPayload> {
  const response = await fetch(`/api/receipts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  return handleResponse<ReceiptPayload>(response);
}

export async function deleteReceipt(id: string): Promise<void> {
  const response = await fetch(`/api/receipts/${id}`, {
    method: "DELETE",
  });

  await handleResponse<{ ok: boolean }>(response);
}
