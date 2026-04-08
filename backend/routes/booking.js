const express = require("express");
const router = express.Router();
const {
getAllBookings,
getNurseBookings,
getPatientBookings,
updateBookingStatus,
updateVisitSummary,
createBooking,
updateBooking,
cancelBooking,
} = require("../controllers/bookingsController");
const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

router.get("/all", requireAuth, requireRole(ROLES.ADMIN), getAllBookings);

router.get("/nurse/:nurseId", requireAuth, requireRole(ROLES.NURSE, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.NURSE && req.user.id !== req.params.nurseId) {
return res.status(403).json({
success: false,
message: "You can only view your own bookings",
});
}
next();
}, getNurseBookings);

router.get("/patient/:patientId", requireAuth, requireRole(ROLES.PATIENT, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.PATIENT && req.user.id !== req.params.patientId) {
return res.status(403).json({
success: false,
message: "You can only view your own bookings",
});
}
next();
}, getPatientBookings);

router.post("/create", requireAuth, requireRole(ROLES.PATIENT), createBooking);

router.put("/status/:id", requireAuth, requireRole(ROLES.NURSE, ROLES.ADMIN), updateBookingStatus);

router.put("/visit-summary/:id", requireAuth, requireRole(ROLES.NURSE, ROLES.ADMIN), updateVisitSummary);

router.put("/update/:id", requireAuth, requireRole(ROLES.PATIENT), updateBooking);

router.put("/cancel/:id", requireAuth, requireRole(ROLES.PATIENT, ROLES.ADMIN), cancelBooking);

module.exports = router;
