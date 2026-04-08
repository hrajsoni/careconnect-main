const express = require("express");
const router = express.Router();
const {
getAllPayments,
getNursePayments,
getPatientPayments,
getPaymentByBookingId,
markPaymentAsPaid,
createPayment,
} = require("../controllers/paymentController");
const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

router.get("/all", requireAuth, requireRole(ROLES.ADMIN), getAllPayments);

router.post("/", requireAuth, requireRole(ROLES.PATIENT), createPayment);

router.get("/nurse/:nurseId", requireAuth, requireRole(ROLES.NURSE, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.NURSE && req.user.id !== req.params.nurseId) {
return res.status(403).json({
success: false,
message: "You can only view your own payments",
});
}
next();
}, getNursePayments);

router.get("/patient/:patientId", requireAuth, requireRole(ROLES.PATIENT, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.PATIENT && req.user.id !== req.params.patientId) {
return res.status(403).json({
success: false,
message: "You can only view your own payments",
});
}
next();
}, getPatientPayments);

router.get("/booking/:bookingId", requireAuth, getPaymentByBookingId);

router.put("/mark-paid/:paymentId", requireAuth, requireRole(ROLES.PATIENT, ROLES.ADMIN), markPaymentAsPaid);

module.exports = router;
