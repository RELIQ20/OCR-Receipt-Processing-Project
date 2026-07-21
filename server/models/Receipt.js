const mongoose = require("mongoose");

/** A single line item inside one merchant receipt. */
const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

/** One scanned merchant receipt (a WhatsApp message can contain more than one). */
const receiptEntrySchema = new mongoose.Schema(
  {
    merchant_name: { type: String, required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String }, // "HH:MM"
    total_amount: { type: Number, required: true },
    currency: { type: String, default: "PHP" },
    drive_link: { type: String },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false }
);

/**
 * One WhatsApp submission from the OpenClaw bot. This is the actual document
 * shape stored in lifewood_db.receipts — a sender can submit multiple
 * merchant receipts in a single message.
 */
const receiptMessageSchema = new mongoose.Schema(
  {
    sender_name: { type: String, required: true },
    status: { type: String, required: true, default: "Processing" },
    source: { type: String, default: "WhatsApp OpenClaw" },
    receipts: { type: [receiptEntrySchema], default: [] },
    grand_total: { type: Number, required: true, default: 0 },
    excel_link: { type: String },
  },
  { timestamps: true, collection: "receipts" }
);

module.exports = mongoose.model("Receipt", receiptMessageSchema, "receipts");
