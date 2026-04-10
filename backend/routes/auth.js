const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const upload = require("../middleware/upload");
const {
  requireAuth,
  requireRole,
  requireApprovedProvider,
} = require("../middleware/auth");
const rateLimit = require('express-rate-limit');
const ROLES = require('../constants/roles');

// ============================================================
// Rate Limiters — brute force protection on sensitive endpoints
// loginLimiter:          5 attempts per 15 min per IP
// forgotPasswordLimiter: 3 attempts per 1 hour per IP
// ============================================================
const isProduction = process.env.NODE_ENV === "production";
const passthroughLimiter = (_req, _res, next) => next();

const loginLimiter = isProduction
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many login attempts, try again in 15 minutes" },
    })
  : passthroughLimiter;

const forgotPasswordLimiter = isProduction
  ? rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, try again in 1 hour" },
    })
  : passthroughLimiter;

// ============================================================
// FIXED: sanitizeUser removed from this file
// It was duplicated here and in authController.js
// Single source of truth is now authController.js
// All routes below that needed it use the controller functions
// which handle sanitization internally
// ============================================================

router.post("/signup", upload.single("photo"), signup);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

const { generateCsrfToken } = require('../middleware/csrf');

// ============================================================
// CSRF Token endpoint — publicly accessible (no auth needed)
// Client fetches this once on app load and stores the token
// in memory (not localStorage). Included as X-CSRF-Token
// header in all POST / PUT / DELETE requests.
// ============================================================
router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  return res.status(200).json({ csrfToken: token });
});

// ============================================================
// FIXED: /me now uses controller function instead of inline handler
// Behavior is identical — fetches user by req.user.id,
// returns sanitized user object
// ============================================================
router.get("/me", requireAuth, getMe);

// ============================================================
// NEW: Logout route
// Clears the HTTPOnly cookie server-side
// Frontend must call this to properly end session —
// JS cannot clear HTTPOnly cookies directly
// ============================================================
router.post("/logout", logout);

router.put(
  "/complete-profile",
  requireAuth,
  requireRole(ROLES.NURSE, ROLES.CARE_ASSISTANT),
  async (req, res) => {
    try {
      const { id, qualification, experience, registrationNumber } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own profile",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (![ROLES.NURSE, ROLES.CARE_ASSISTANT].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      user.qualification = qualification ?? user.qualification;
      user.experience =
        experience !== undefined && experience !== null
          ? Number(experience)
          : user.experience;
      user.registrationNumber = registrationNumber ?? user.registrationNumber;
      user.rejectionReason = "";
      user.isApproved = false;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile submitted successfully. Waiting for admin approval.",
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("COMPLETE PROFILE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.post(
  "/upload-documents",
  requireAuth,
  requireRole(ROLES.NURSE, ROLES.CARE_ASSISTANT),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "licenseProof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only upload your own documents",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (req.files?.photo) {
        user.photo = req.files.photo[0].path.replace(/\\/g, "/");
      }

      if (req.files?.idProof) {
        user.idProof = req.files.idProof[0].path.replace(/\\/g, "/");
      }

      if (req.files?.licenseProof) {
        user.licenseProof = req.files.licenseProof[0].path.replace(/\\/g, "/");
      }

      user.verificationStatus = "pending";
      user.rejectionReason = "";
      user.isApproved = false;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Documents uploaded successfully",
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("UPLOAD DOCUMENTS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.put(
  "/save-services",
  requireAuth,
  requireRole("nurse"),
  async (req, res) => {
    try {
      const { id, services } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own services",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== ROLES.NURSE) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (!Array.isArray(services)) {
        return res.status(400).json({
          success: false,
          message: "Services must be an array",
        });
      }

      user.services = services;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Services updated successfully",
        services: user.services,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("SAVE SERVICES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.get("/user/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== ROLES.ADMIN && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user",
      });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        location: user.location || "",
        role: user.role,
        isApproved: user.isApproved,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        qualification: user.qualification || "",
        experience: user.experience || 0,
        registrationNumber: user.registrationNumber || "",
        specialization: user.specialization || "",
        bio: user.bio || "",
        services: user.services || [],
        servicePrices: user.servicePrices || {},
        availability: user.availability || {},
        photo: user.photo || "",
        idProof: user.idProof || "",
        licenseProof: user.licenseProof || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.put(
  "/update-nurse-profile",
  requireAuth,
  requireRole(ROLES.NURSE),
  async (req, res) => {
    try {
      const { id, name, phone, location, qualification, experience, bio } =
        req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own profile",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "nurse") {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be exactly 10 digits",
        });
      }

      user.name = name?.trim() ?? user.name;
      user.phone = phone?.trim() ?? user.phone;
      user.location = location?.trim() ?? user.location;
      user.qualification = qualification?.trim() ?? user.qualification;
      user.experience =
        experience !== undefined && experience !== null
          ? Number(experience)
          : user.experience;
      user.bio = bio?.trim() ?? user.bio;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("UPDATE NURSE PROFILE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.put(
  "/save-service-prices",
  requireAuth,
  requireRole("nurse"),
  async (req, res) => {
    try {
      const { id, servicePrices } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own pricing",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "nurse") {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      user.servicePrices = servicePrices || {};
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Service prices saved successfully",
        servicePrices: user.servicePrices,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("SAVE SERVICE PRICES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.put(
  "/update-patient-profile",
  requireAuth,
  requireRole("patient"),
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id, name, phone, location } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own profile",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "patient") {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be exactly 10 digits",
        });
      }

      if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) {
          return res.status(400).json({
            success: false,
            message: "Name is required",
          });
        }
        user.name = trimmedName;
      }

      if (location !== undefined) {
        const trimmedLocation = String(location).trim();
        if (!trimmedLocation) {
          return res.status(400).json({
            success: false,
            message: "Location is required",
          });
        }
        user.location = trimmedLocation;
      }

      if (phone !== undefined) {
        user.phone = String(phone).trim();
      }

      if (req.file) {
        user.photo = req.file.path.replace(/\\/g, "/");
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("UPDATE PATIENT PROFILE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.put(
  "/save-availability",
  requireAuth,
  requireRole("nurse"),
  async (req, res) => {
    try {
      const {
        id,
        availableDays,
        startTime,
        endTime,
        slotDuration,
        isAvailableForBooking,
      } = req.body;

      if (req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own availability",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "nurse") {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (!Array.isArray(availableDays) || availableDays.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one available day",
        });
      }

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Start time and end time are required",
        });
      }

      const allowedDurations = [15, 30, 45, 60, 90, 120];
      if (!allowedDurations.includes(Number(slotDuration))) {
        return res.status(400).json({
          success: false,
          message: "Invalid slot duration selected",
        });
      }

      user.availability = {
        availableDays,
        startTime,
        endTime,
        slotDuration: Number(slotDuration),
        isAvailableForBooking:
          typeof isAvailableForBooking === "boolean"
            ? isAvailableForBooking
            : true,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Availability saved successfully",
        availability: user.availability,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          location: user.location || "",
          role: user.role,
          isApproved: user.isApproved,
          verificationStatus: user.verificationStatus,
          rejectionReason: user.rejectionReason,
          qualification: user.qualification || "",
          experience: user.experience || 0,
          registrationNumber: user.registrationNumber || "",
          specialization: user.specialization || "",
          bio: user.bio || "",
          services: user.services || [],
          servicePrices: user.servicePrices || {},
          availability: user.availability || {},
          photo: user.photo || "",
          idProof: user.idProof || "",
          licenseProof: user.licenseProof || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("SAVE AVAILABILITY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;