const express = require("express");
const router = express.Router();
const {
  createAmbulanceRequest,
  getPatientAmbulanceRequests,
  getBookingAmbulanceRequests,
  getAllAmbulanceRequests,
  updateAmbulanceStatus,
} = require("../controllers/ambulanceController");
const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

// Create a new ambulance request (patient, nurse, care_assistant)
router.post(
  "/request",
  requireAuth,
  requireRole(ROLES.PATIENT, ROLES.NURSE, ROLES.CARE_ASSISTANT),
  createAmbulanceRequest
);

// Get all ambulance requests for a patient
router.get(
  "/patient/:patientId",
  requireAuth,
  requireRole(ROLES.PATIENT, ROLES.NURSE, ROLES.ADMIN),
  getPatientAmbulanceRequests
);

// Get ambulance requests linked to a specific booking
router.get(
  "/booking/:bookingId",
  requireAuth,
  requireRole(ROLES.PATIENT, ROLES.NURSE, ROLES.ADMIN),
  getBookingAmbulanceRequests
);

// Admin: get all ambulance requests
router.get(
  "/all",
  requireAuth,
  requireRole(ROLES.ADMIN),
  getAllAmbulanceRequests
);

// Admin: update ambulance status
router.put(
  "/status/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  updateAmbulanceStatus
);

module.exports = router;
