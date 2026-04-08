const express = require("express");
const router = express.Router();
const User = require("../models/User");
const ROLES = require("../constants/roles");

// ============================================================
// FIXED: Regex escape helper
// Previously: user input passed directly into $regex
// Attack: location=".*(drop all).*" could cause DoS or
//         be crafted to extract data unexpectedly
// Now: all special regex characters are escaped before use
// ============================================================
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
========================================
✅ GET ALL APPROVED NURSES (PUBLIC)
========================================
*/
router.get("/", async (req, res) => {
  try {
    const { location, service } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    let filter = {
      role: ROLES.NURSE,
      isApproved: true,
      verificationStatus: "approved",
    };

    if (location) {
      filter.location = { $regex: escapeRegex(location), $options: "i" };
    }

    if (service) {
      filter.services = { $in: [service] };
    }

    const [nurses, total] = await Promise.all([
      User.find(filter)
        .select("name photo location specialization services servicePrices availability bio experience rating")
        .skip(skip).limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: nurses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET ALL NURSES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// FIXED: Debug endpoint removed
// Previously: GET /debug/all-nurses exposed ALL nurses
// including unapproved ones, rejection reasons, and
// verification status — with ZERO authentication required
// Any visitor with the URL could access this data
// No legitimate production use case for this endpoint
// ============================================================

/*
========================================
✅ GET ALL APPROVED NURSES
========================================
*/
router.get("/approved", async (req, res) => {
  try {
    const { location, service } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    let filter = {
      role: ROLES.NURSE,
      isApproved: true,
      verificationStatus: "approved",
    };

    if (location) {
      filter.location = { $regex: escapeRegex(location), $options: "i" };
    }

    if (service) {
      filter.services = { $in: [service] };
    }

    const [nurses, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .skip(skip).limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: nurses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET APPROVED NURSES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
========================================
✅ GET SINGLE APPROVED NURSE
========================================
*/
router.get("/:id", async (req, res) => {
  try {
    const nurse = await User.findOne({
      _id: req.params.id,
      role: ROLES.NURSE,
      isApproved: true,
      verificationStatus: "approved",
    }).select("-password");

    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    res.status(200).json(nurse);
  } catch (error) {
    console.error("GET SINGLE NURSE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;