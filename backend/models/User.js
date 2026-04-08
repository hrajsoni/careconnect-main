const mongoose = require("mongoose");
const ROLES = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    experience: {
      type: Number,
      default: 0,
    },

    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },

    specialization: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      trim: true,
    },

    services: [
      {
        type: String,
      },
    ],

    servicePrices: {
      type: Map,
      of: Number,
      default: {},
    },

    availability: {
      availableDays: {
        type: [String],
        default: [],
      },
      startTime: {
        type: String,
        default: "",
      },
      endTime: {
        type: String,
        default: "",
      },
      slotDuration: {
        type: Number,
        default: 30,
      },
      isAvailableForBooking: {
        type: Boolean,
        default: true,
      },
    },

    photo: {
      type: String,
      default: "",
    },

    idProof: {
      type: String,
      default: "",
    },

    licenseProof: {
      type: String,
      default: "",
    },

    resetPasswordToken: {
      type: String,
      default: "",
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ============================================================
// FIXED: Email validation and normalization pre-save
// Previously: unique:true alone cannot prevent duplicate null/
// empty emails in some MongoDB edge cases, and case-variant
// addresses (User@email.com vs user@email.com) could create
// separate accounts pointing to the same inbox.
//
// Now: this hook fires before every .save() call and:
//   1. Rejects empty / missing emails immediately
//   2. Normalizes email to lowercase+trim so the unique index
//      always compares equivalent addresses with the same string
// ============================================================
userSchema.pre('save', function() {
  if (!this.email || this.email.trim() === '') {
    throw new Error('Email is required');
  }
  this.email = this.email.toLowerCase().trim();
});

module.exports = mongoose.model("User", userSchema);