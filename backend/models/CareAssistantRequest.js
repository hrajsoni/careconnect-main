const mongoose = require("mongoose");

const careAssistantRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    careAssistant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    requestType: {
      type: String,
      enum: [
        "doctor_visit",
        "medical_followup",
        "pickup_drop",
        "hospital_discharge",
        "general_assistance",
      ],
      required: true,
    },

    scheduledDate: {
      type: String,
      required: true,
      trim: true,
    },

    scheduledTime: {
      type: String,
      required: true,
      trim: true,
    },

    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CareAssistantRequest",
  careAssistantRequestSchema
);