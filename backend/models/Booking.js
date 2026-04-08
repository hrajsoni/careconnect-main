const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
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

    service: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      default: "",
    },

    time: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["online", "cash", "manual"],
      default: "online",
    },

    paymentAmount: {
      type: Number,
      default: 0,
    },

    paymentReference: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    cancellationReason: {
      type: String,
      default: "",
    },

    patientAddress: {
      type: String,
      default: "",
    },

    visitSummary: {
      bloodPressure: {
        type: String,
        default: "",
      },
      temperature: {
        type: String,
        default: "",
      },
      sugarLevel: {
        type: String,
        default: "",
      },
      oxygenLevel: {
        type: String,
        default: "",
      },
      pulseRate: {
        type: String,
        default: "",
      },
      treatmentProvided: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
      followUpRequired: {
        type: Boolean,
        default: false,
      },
      followUpNotes: {
        type: String,
        default: "",
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
