const express = require("express");
const {
  getAllDoctors,
  getAdminDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");
const DoctorBooking = require("../models/DoctorBooking");

const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

const router = express.Router();

router.get("/", getAllDoctors);

router.post("/connect", requireAuth, async (req, res) => {
  try {
    const { doctorId, amount, date } = req.body;
    const booking = await DoctorBooking.create({
      patient: req.user.id,
      doctor: doctorId,
      amount,
      appointmentDate: date || new Date(),
      paymentStatus: "completed"
    });
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));
router.get("/admin", getAdminDoctors);
router.post("/", createDoctor);
router.put("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

module.exports = router;
