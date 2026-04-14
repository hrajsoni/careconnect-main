const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const sendEmail = require("../utils/sendEmail");
const {
approvalTemplate,
rejectionTemplate,
} = require("../utils/emailTemplates");
const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

const sanitizeUser = (user) => ({
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
});

// Reusable pagination helper — extracts page/limit from query string
const paginate = (req) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

router.use(requireAuth, requireRole("admin"));

/*
========================================
GET ADMIN STATS
========================================
*/
router.get("/stats", async (req, res) => {
try {
const totalPatients = await User.countDocuments({ role: ROLES.PATIENT });
const totalNurses = await User.countDocuments({ role: ROLES.NURSE });
const totalCareAssistants = await User.countDocuments({ role: ROLES.CARE_ASSISTANT });

const pendingNurses = await User.countDocuments({ role: ROLES.NURSE, verificationStatus: "pending" });
const approvedNurses = await User.countDocuments({ role: ROLES.NURSE, verificationStatus: "approved" });
const rejectedNurses = await User.countDocuments({ role: ROLES.NURSE, verificationStatus: "rejected" });

const pendingCareAssistants = await User.countDocuments({ role: ROLES.CARE_ASSISTANT, verificationStatus: "pending" });
const approvedCareAssistants = await User.countDocuments({ role: ROLES.CARE_ASSISTANT, verificationStatus: "approved" });

const totalBookings = await Booking.countDocuments({});
const activeBookings = await Booking.countDocuments({ status: { $in: ["pending", "accepted"] } });
const completedBookings = await Booking.countDocuments({ status: "completed" });

const totalPayments = await Payment.countDocuments({});
const paidPayments = await Payment.find({ status: "paid" });
const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);

return res.status(200).json({
success: true,
data: {
totalPatients,
totalNurses,
totalCareAssistants,
pendingNurses,
approvedNurses,
rejectedNurses,
pendingCareAssistants,
approvedCareAssistants,
totalBookings,
activeBookings,
completedBookings,
totalPayments,
totalRevenue,
},
});
} catch (error) {
console.error("ADMIN STATS ERROR:", error);
return res.status(500).json({ success: false, message: "Server error" });
}
});

/*
========================================
GET ALL BOOKINGS (ADMIN) — paginated
========================================
*/
router.get("/bookings", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = {};

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip).limit(limit)
        .populate("patientId", "name phone location role")
        .populate("nurseId", "name email phone location role qualification experience services")
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN BOOKINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
========================================
GET ALL PAYMENTS (ADMIN) — paginated
========================================
*/
router.get("/payments", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = {};

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .skip(skip).limit(limit)
        .populate("bookingId", "service date time location status paymentStatus paymentMethod paymentReference paymentAmount paidAt")
        .populate("patientId", "name email phone")
        .populate("nurseId", "name email phone")
        .sort({ createdAt: -1 }),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN PAYMENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
========================================
GET ALL PATIENTS (ADMIN) — paginated
========================================
*/
router.get("/patients", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.PATIENT };

    const [patients, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: patients.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN PATIENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
========================================
NURSE LIST ROUTES — paginated
========================================
*/
router.get("/pending-nurses", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.NURSE, verificationStatus: "pending" };

    const [nurses, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: nurses.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PENDING NURSES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/approved-nurses", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.NURSE, verificationStatus: "approved" };

    const [nurses, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: nurses.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("APPROVED NURSES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/rejected-nurses", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.NURSE, verificationStatus: "rejected" };

    const [nurses, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: nurses.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("REJECTED NURSES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/nurses", async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.NURSE };

    if (status !== "all") query.verificationStatus = status;

    const [nurses, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: nurses.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN NURSES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
========================================
CARE ASSISTANT LIST ROUTES — paginated
========================================
*/
router.get("/pending-care-assistants", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.CARE_ASSISTANT, verificationStatus: "pending" };

    const [assistants, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: assistants.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PENDING CARE ASSISTANTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/approved-care-assistants", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.CARE_ASSISTANT, verificationStatus: "approved" };

    const [assistants, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: assistants.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("APPROVED CARE ASSISTANTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/rejected-care-assistants", async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.CARE_ASSISTANT, verificationStatus: "rejected" };

    const [assistants, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: assistants.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("REJECTED CARE ASSISTANTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/care-assistants", async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const { page, limit, skip } = paginate(req);
    const query = { role: ROLES.CARE_ASSISTANT };

    if (status !== "all") query.verificationStatus = status;

    const [assistants, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: assistants.map(sanitizeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN CARE ASSISTANTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
========================================
APPROVE / REJECT (single-record — no pagination)
========================================
*/
router.put("/approve/:id", async (req, res) => {
try {
const user = await User.findById(req.params.id);

if (!user) {
return res.status(404).json({ success: false, message: "User not found" });
}

if (![ROLES.NURSE, ROLES.CARE_ASSISTANT].includes(user.role)) {
return res.status(400).json({
success: false,
message: "Selected user is not an approvable provider",
});
}

user.isApproved = true;
user.verificationStatus = "approved";
user.rejectionReason = "";
await user.save();

if (user.email) {
await sendEmail({
to: user.email,
subject: "CareConnect Account Approved",
text: `Hello ${user.name}, your ${user.role.replace("_", " ")} account has been approved.`,
html: approvalTemplate({ name: user.name, role: user.role }),
});
}

return res.status(200).json({
success: true,
message: `${user.role === ROLES.CARE_ASSISTANT ? "Care assistant" : "Nurse"} approved successfully`,
user: sanitizeUser(user),
nurse: sanitizeUser(user),
});
} catch (error) {
console.error("APPROVE PROVIDER ERROR:", error);
return res.status(500).json({ success: false, message: "Server error" });
}
});

router.put("/reject/:id", async (req, res) => {
try {
const { reason } = req.body;
const user = await User.findById(req.params.id);

if (!user) {
return res.status(404).json({ success: false, message: "User not found" });
}

if (![ROLES.NURSE, ROLES.CARE_ASSISTANT].includes(user.role)) {
return res.status(400).json({
success: false,
message: "Selected user is not an approvable provider",
});
}

user.isApproved = false;
user.verificationStatus = "rejected";
user.rejectionReason = reason?.trim() || "Application rejected";
await user.save();

if (user.email) {
await sendEmail({
to: user.email,
subject: "CareConnect Application Update",
text: `Hello ${user.name}, your ${user.role.replace("_", " ")} application has been reviewed.`,
html: rejectionTemplate({
name: user.name,
role: user.role,
reason: user.rejectionReason,
}),
});
}

return res.status(200).json({
success: true,
message: `${user.role === ROLES.CARE_ASSISTANT ? "Care assistant" : "Nurse"} rejected successfully`,
user: sanitizeUser(user),
nurse: sanitizeUser(user),
});
} catch (error) {
console.error("REJECT PROVIDER ERROR:", error);
return res.status(500).json({ success: false, message: "Server error" });
}
});

module.exports = router;
