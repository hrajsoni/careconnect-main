const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
    },

    // Revenue split: nurse receives 70%, platform retains 30%
    nurseEarnings: {
      type: Number,
      default: 0,
    },

    platformFee: {
      type: Number,
      default: 0,
    },

    method: {
      type: String,
      enum: ["online", "cash", "manual", "upi", "qr"],
      default: "online",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    reference: {
      type: String,
      default: "",
      trim: true,
    },

    gateway: {
      type: String,
      default: "manual",
      trim: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    service: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);