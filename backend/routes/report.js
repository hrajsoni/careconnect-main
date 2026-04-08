const express = require("express");
const router = express.Router();
const Report = require("../models/Report");
const User = require("../models/User");
const Booking = require("../models/Booking");
const upload = require("../middleware/upload");

// ============================================================
// FIXED: Import auth middleware
// Previously: no authentication on either endpoint
// Now: both endpoints require login, with role-based access
// ============================================================
const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

// Allowed MIME types and max file size for patient report uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/*
========================================
✅ UPLOAD PATIENT REPORT
========================================
*/
// FIXED: Added requireAuth + requireRole
// Previously: any unauthenticated user could upload reports for any patient
// Now: only nurses and admins can upload reports
router.post(
  "/upload-report",
  requireAuth,
  requireRole(ROLES.NURSE, ROLES.ADMIN, ROLES.PATIENT),
  upload.single("report"),
  async (req, res) => {
    try {
      const { patientId, notes } = req.body;

      // FIXED: Validate patientId was provided in request body
      if (!patientId) {
        return res.status(400).json({ message: "patientId is required" });
      }
      
      if (req.user.role === ROLES.PATIENT && patientId !== req.user.id) {
        return res.status(403).json({ error: "You can only upload your own reports" });
      }

      const user = await User.findById(patientId);

      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (user.role !== ROLES.PATIENT) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Server-side file validation (defense in depth — multer also checks)
      if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Only JPG, PNG, and PDF files are allowed' });
      }

      if (req.file.size > MAX_SIZE) {
        return res.status(400).json({ error: 'File size must be under 5MB' });
      }

      const report = new Report({
        patientId,
        fileUrl: req.file.path,
        originalName: req.file.originalname,
        notes: notes || "",
      });

      await report.save();

      res.status(201).json({
        message: "Report uploaded successfully",
        report,
      });
    } catch (error) {
      console.error("UPLOAD REPORT ERROR:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/*
========================================
✅ GET REPORTS BY PATIENT
========================================
*/
// FIXED: Added requireAuth + ownership check
// Previously: anyone could fetch any patient's medical reports
// Now:
//   - Patients can only fetch their own reports
//   - Nurses and admins can fetch any patient's reports
router.get(
  "/patient-reports/:patientId",
  requireAuth,
  requireRole(ROLES.PATIENT, ROLES.NURSE, ROLES.ADMIN),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      // FIXED: Ownership check
      // Patients can only view their own reports
      if (
        req.user.role === ROLES.PATIENT &&
        req.user.id !== patientId
      ) {
        return res.status(403).json({
          message: "You can only view your own reports",
        });
      }

      if (req.user.role === ROLES.NURSE) {
        const linkedBooking = await Booking.findOne({
          patientId,
          nurseId: req.user.id,
        }).select("_id");

        if (!linkedBooking) {
          return res.status(403).json({
            message: "You can only view reports for your assigned patients",
          });
        }
      }

      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip  = (page - 1) * limit;
      const reportQuery = { patientId };

      const [reports, total] = await Promise.all([
        Report.find(reportQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Report.countDocuments(reportQuery),
      ]);

      res.status(200).json({
        success: true,
        data: reports,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("GET REPORTS ERROR:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
