const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    vendor: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, required: true },
    auto: { type: Boolean, required: true },
    paymentMethod: { type: String, required: true },
    paymentType: { type: String, required: true },
    source: { type: String, required: true },
    accountLast4: { type: String, required: true },
    contactNumber: { type: String, required: true },
    imagePreview: { type: String },
    lineItems: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    timeline: [
      {
        label: { type: String, required: true },
        time: { type: String, required: true },
        done: { type: Boolean, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
