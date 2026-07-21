const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Receipt = require("./models/Receipt");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
let isMongoConnected = false;
const memoryReceipts = [];

///function seedMemoryReceipts() {
  if (memoryReceipts.length > 0) return;

  const now = new Date();
  memoryReceipts.push(
    {
      id: "seed_1",
      vendor: "Starbucks",
      amount: 420.5,
      date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(),
      category: "Food & Drink",
      status: "complete",
      auto: true,
      paymentMethod: "GCash",
      paymentType: "online",
      source: "upload",
      accountLast4: "5008",
      contactNumber: "+63 917 555 0192",
      imagePreview: undefined,
      lineItems: [
        { id: "li_seed_1", name: "Latte", qty: 1, price: 180 },
        { id: "li_seed_2", name: "Blueberry muffin", qty: 1, price: 120.5 },
      ],
      timeline: [
        { label: "Uploaded", time: "09:10", done: true },
        { label: "OCR scan", time: "Complete", done: true },
        { label: "AI extraction", time: "Complete", done: true },
      ],
    },
    {
      id: "seed_2",
      vendor: "Google Drive",
      amount: 199.0,
      date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(),
      category: "Subscription",
      status: "pending",
      auto: true,
      paymentMethod: "Visa •• 5008",
      paymentType: "online",
      source: "email",
      accountLast4: "5008",
      contactNumber: "+63 2 8888 0000",
      imagePreview: undefined,
      lineItems: [{ id: "li_seed_3", name: "Storage plan", qty: 1, price: 199 }],
      timeline: [
        { label: "Uploaded", time: "13:20", done: true },
        { label: "OCR scan", time: "Pending", done: false },
      ],
    }
  );
///}

function normalizeReceipt(data) {
  return {
    ...data,
    lineItems: data.lineItems || [],
    timeline: data.timeline || [],
  };
}

async function listReceipts() {
  if (isMongoConnected) {
    const receipts = await Receipt.find({}).sort({ createdAt: -1 });
    return receipts.map((receipt) => receipt.toObject());
  }

  return memoryReceipts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function createReceipt(data) {
  const payload = normalizeReceipt(data);

  if (isMongoConnected) {
    return Receipt.create(payload);
  }

  memoryReceipts.unshift(payload);
  return payload;
}

async function updateReceipt(id, updates) {
  const payload = normalizeReceipt({ ...updates });

  if (isMongoConnected) {
    return Receipt.findOneAndUpdate({ id }, payload, {
      new: true,
      runValidators: true,
    });
  }

  const index = memoryReceipts.findIndex((receipt) => receipt.id === id);
  if (index === -1) return null;
  memoryReceipts[index] = { ...memoryReceipts[index], ...payload };
  return memoryReceipts[index];
}

async function deleteReceipt(id) {
  if (isMongoConnected) {
    const result = await Receipt.findOneAndDelete({ id });
    return Boolean(result);
  }

  const index = memoryReceipts.findIndex((receipt) => receipt.id === id);
  if (index === -1) return false;
  memoryReceipts.splice(index, 1);
  return true;
}

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is running" });
});

app.get("/api/receipts", async (req, res) => {
  try {
    res.json(await listReceipts());
  } catch (error) {
    console.error("Failed to fetch receipts", error);
    res.status(500).json({ error: "failed_to_fetch_receipts" });
  }
});

app.post("/api/receipts", async (req, res) => {
  try {
    const receipt = await createReceipt(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    console.error("Failed to create receipt", error);
    res.status(500).json({ error: "failed_to_create_receipt" });
  }
});

app.put("/api/receipts/:id", async (req, res) => {
  try {
    const receipt = await updateReceipt(req.params.id, req.body);
    if (!receipt) {
      return res.status(404).json({ error: "receipt_not_found" });
    }

    res.json(receipt);
  } catch (error) {
    console.error("Failed to update receipt", error);
    res.status(500).json({ error: "failed_to_update_receipt" });
  }
});

app.delete("/api/receipts/:id", async (req, res) => {
  try {
    const removed = await deleteReceipt(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "receipt_not_found" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete receipt", error);
    res.status(500).json({ error: "failed_to_delete_receipt" });
  }
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

seedMemoryReceipts();

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 })
  .then(() => {
    isMongoConnected = true;
    console.log("Connected to the LifewoodDB");
    startServer();
  })
  .catch((err) => {
    console.warn("MongoDB not available, falling back to in-memory receipts:", err.message);
    startServer();
  });
