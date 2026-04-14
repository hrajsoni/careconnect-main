const mongoose = require("mongoose");

const ambulanceRequestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // Who initiated the request: 'patient', 'nurse', 'care_assistant'
    requestedBy: {
      type: String,
      enum: ["patient", "nurse", "care_assistant"],
      default: "patient",
    },

    requestedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    patientName: {
      type: String,
      default: "",
    },

    patientPhone: {
      type: String,
      default: "",
    },

    pickupAddress: {
      type: String,
      required: true,
    },

    // Dummy hospital selection
    selectedHospital: {
      type: String,
      default: "",
    },

    hospitalId: {
      type: String,
      default: "",
    },

    // Dummy bed booking
    bedBooked: {
      type: Boolean,
      default: false,
    },

    bedNumber: {
      type: String,
      default: "",
    },

    bedType: {
      type: String,
      enum: ["ICU", "General", "Emergency", ""],
      default: "",
    },

    condition: {
      type: String,
      enum: ["critical", "serious", "stable", ""],
      default: "critical",
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["requested", "dispatched", "arrived", "completed", "cancelled"],
      default: "requested",
    },

    // Dummy ETA in minutes
    estimatedArrival: {
      type: Number,
      default: 10,
    },

    // Dummy ambulance details
    ambulanceNumber: {
      type: String,
      default: "",
    },

    driverName: {
      type: String,
      default: "",
    },

    driverPhone: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AmbulanceRequest", ambulanceRequestSchema);
