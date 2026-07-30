const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const exceljs = require("exceljs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Receipt = require("./models/Receipt");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lifewood_db";

if (!process.env.MONGO_URI) {
  console.warn(
    "⚠️  MONGO_URI was not found in the environment. Falling back to a local Mongo URI that likely doesn't exist. " +
      "Check that server/.env exists, is saved as UTF-8 (not UTF-16), and contains a MONGO_URI= line."
  );
}

// The Atlas connection string in .env has no database name in its path
// (mongodb+srv://user:pass@cluster.mongodb.net/?appName=...), which means
// mongoose would otherwise silently connect to the default "test" database
// instead of the real "lifewood_db" your data actually lives in. Setting
// dbName explicitly here fixes that regardless of what's in the URI.
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "lifewood_db";

let isMongoConnected = false;
const memoryReceipts = [];

function normalizeItem(item) {
  return {
    description: item?.description ?? "",
    price: Number(item?.price) || 0,
  };
}

function normalizeReceiptEntry(entry) {
  return {
    merchant_name: entry?.merchant_name ?? "Unknown merchant",
    date: entry?.date ?? "",
    time: entry?.time ?? "",
    total_amount: Number(entry?.total_amount) || 0,
    currency: entry?.currency ?? "PHP",
    drive_link: entry?.drive_link ?? undefined,
    items: Array.isArray(entry?.items) ? entry.items.map(normalizeItem) : [],
  };
}

/** Always recompute grand_total from the receipts array so edits can't drift out of sync. */
function normalizeMessage(data) {
  const receipts = Array.isArray(data?.receipts) ? data.receipts.map(normalizeReceiptEntry) : [];
  const grand_total = receipts.reduce((sum, r) => sum + r.total_amount, 0);

  return {
    sender_name: data?.sender_name ?? "Unknown sender",
    status: data?.status ?? "Processing",
    source: data?.source ?? "WhatsApp OpenClaw",
    receipts,
    grand_total,
    excel_link: data?.excel_link ?? undefined,
  };
}

function toClientShape(doc) {
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: String(_id ?? obj.id), ...rest, createdAt: obj.createdAt, updatedAt: obj.updatedAt };
}

async function listReceipts() {
  if (isMongoConnected) {
    const docs = await Receipt.find({}).sort({ createdAt: -1 });
    return docs.map(toClientShape);
  }

  return memoryReceipts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createReceipt(data) {
  const payload = normalizeMessage(data);
  // New submissions always enter the pipeline as "Processing", no matter what
  // status the caller (e.g. the WhatsApp OpenClaw bot) sends in the payload.
  // Status is only meant to change later, via PUT /api/receipts/:id.
  payload.status = "Processing";

  if (isMongoConnected) {
    const created = await Receipt.create(payload);
    return toClientShape(created);
  }

  const withId = { id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), ...payload };
  memoryReceipts.unshift(withId);
  return withId;
}

async function updateReceipt(id, updates) {
  if (isMongoConnected) {
    // Merge against the existing document so a partial edit (e.g. just the
    // status) doesn't wipe out the receipts array.
    const existing = await Receipt.findById(id);
    if (!existing) return null;
    const merged = normalizeMessage({ ...existing.toObject(), ...updates });
    const updated = await Receipt.findByIdAndUpdate(id, merged, { new: true, runValidators: true });
    return updated ? toClientShape(updated) : null;
  }

  const index = memoryReceipts.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const merged = normalizeMessage({ ...memoryReceipts[index], ...updates });
  memoryReceipts[index] = { ...memoryReceipts[index], ...merged };
  return memoryReceipts[index];
}

async function deleteReceipt(id) {
  if (isMongoConnected) {
    const result = await Receipt.findByIdAndDelete(id);
    return Boolean(result);
  }

  const index = memoryReceipts.findIndex((r) => r.id === id);
  if (index === -1) return false;
  memoryReceipts.splice(index, 1);
  return true;
}

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is running", mongoConnected: isMongoConnected });
});

app.get("/api/receipts", async (req, res) => {
  try {
    res.json(await listReceipts());
  } catch (error) {
    console.error("Failed to fetch receipts", error);
    res.status(500).json({ error: "failed_to_fetch_receipts" });
  }
});

app.get("/api/receipts/export", async (req, res) => {
  try {
    const { sender } = req.query;
    if (!sender) {
      return res.status(400).json({ error: "missing_sender" });
    }

    const allReceipts = await listReceipts();
    const senderReceipts = allReceipts.filter(
      (r) => r.sender_name && r.sender_name.trim().toLowerCase() === sender.trim().toLowerCase()
    );

    const workbook = new exceljs.Workbook();
    workbook.creator = "LifeReceipt System";
    workbook.created = new Date();

    const sheets = {
      Processing: workbook.addWorksheet("Processing"),
      Confirmed: workbook.addWorksheet("Confirmed"),
    };

    // Initialize columns for all sheets
    Object.values(sheets).forEach((sheet) => {
      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Merchant", key: "merchant", width: 30 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Items Count", key: "itemsCount", width: 15 },
        { header: "Source", key: "source", width: 20 },
      ];
      sheet.getRow(1).font = { bold: true };
    });

    senderReceipts.forEach((msg) => {
      // Determine which sheet to put it in based on status.
      // Now only "Processing" and "Confirmed"
      let statusKey = msg.status ? msg.status.trim().toLowerCase() : "processing";
      
      let sheetKey = "Processing";
      if (statusKey === "confirmed") {
        sheetKey = "Confirmed";
      }

      const sheet = sheets[sheetKey] || sheets["Processing"]; // fallback

      msg.receipts.forEach((r) => {
        sheet.addRow({
          date: r.date,
          merchant: r.merchant_name,
          amount: r.total_amount,
          currency: r.currency,
          itemsCount: r.items ? r.items.length : 0,
          source: msg.source,
        });
      });
    });

    // Add a Total row to each sheet
    ["Processing", "Confirmed"].forEach(sheetKey => {
      const sheet = sheets[sheetKey];
      if (sheet && sheet.rowCount > 1) { // If there are rows besides the header
        sheet.addRow({}); // Empty row for spacing
        
        // Sum up the amounts (assuming amount is in column C / index 3)
        let total = 0;
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1 && rowNumber < sheet.rowCount) { // skip header and the empty row
            const val = row.getCell('amount').value;
            if (typeof val === 'number') total += val;
            else if (typeof val === 'string') total += parseFloat(val) || 0;
          }
        });

        const totalRow = sheet.addRow({
          merchant: "GRAND TOTAL:",
          amount: total
        });
        totalRow.font = { bold: true };
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Receipts_${sender.replace(/[^a-z0-9]/gi, "_")}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export receipts", error);
    res.status(500).json({ error: "failed_to_export" });
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

app.get("/api/ip", (req, res) => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  let ip = "127.0.0.1";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal && net.address.startsWith("192.168.")) {
        ip = net.address;
        break;
      }
    }
  }
  res.json({ ip, port: PORT });
});

/* ============================================================================
   START SERVER
   ========================================================================= */
function startServer() {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 4000, dbName: MONGO_DB_NAME })
  .then(() => {
    isMongoConnected = true;
    console.log(`Connected to MongoDB (db: ${MONGO_DB_NAME})`);
    startServer();
  })
  .catch((err) => {
    console.warn("MongoDB not available, falling back to in-memory receipts:", err.message);
    startServer();
  });