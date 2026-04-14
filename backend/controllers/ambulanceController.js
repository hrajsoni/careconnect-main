const AmbulanceRequest = require("../models/AmbulanceRequest");
const Booking = require("../models/Booking");

// Dummy ambulance pool for showcase
const DUMMY_AMBULANCES = [
  { number: "MH-01-AB-1234", driverName: "Ramesh Patil", phone: "9876543210" },
  { number: "MH-12-CD-5678", driverName: "Suresh Kumar", phone: "9845612307" },
  { number: "MH-05-EF-9012", driverName: "Anil Sharma", phone: "9712345678" },
  { number: "DL-01-GH-3456", driverName: "Vijay Singh", phone: "9654321098" },
];

function assignDummyAmbulance() {
  const amb = DUMMY_AMBULANCES[Math.floor(Math.random() * DUMMY_AMBULANCES.length)];
  const eta = Math.floor(Math.random() * 10) + 5; // 5–14 min
  return { ambulanceNumber: amb.number, driverName: amb.driverName, driverPhone: amb.phone, estimatedArrival: eta };
}

// POST /api/ambulance/request
const createAmbulanceRequest = async (req, res) => {
  try {
    const {
      patientId,
      bookingId,
      pickupAddress,
      selectedHospital,
      hospitalId,
      bedBooked,
      bedNumber,
      bedType,
      condition,
      notes,
      patientName,
      patientPhone,
    } = req.body;

    if (!patientId || !pickupAddress) {
      return res.status(400).json({
        success: false,
        message: "patientId and pickupAddress are required.",
      });
    }

    // Verify booking exists (if provided) and patient is related
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
    }

    const ambulanceDetails = assignDummyAmbulance();

    const request = await AmbulanceRequest.create({
      patientId,
      bookingId: bookingId || null,
      requestedBy: req.user.role,
      requestedByUserId: req.user.id,
      patientName: patientName || "",
      patientPhone: patientPhone || "",
      pickupAddress,
      selectedHospital: selectedHospital || "",
      hospitalId: hospitalId || "",
      bedBooked: bedBooked || false,
      bedNumber: bedNumber || "",
      bedType: bedType || "",
      condition: condition || "critical",
      notes: notes || "",
      status: "dispatched",
      ...ambulanceDetails,
    });

    return res.status(201).json({
      success: true,
      message: "Ambulance dispatched successfully.",
      data: request,
    });
  } catch (err) {
    console.error("createAmbulanceRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/ambulance/patient/:patientId
const getPatientAmbulanceRequests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const requests = await AmbulanceRequest.find({ patientId })
      .sort({ createdAt: -1 })
      .populate("bookingId", "service date")
      .lean();
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("getPatientAmbulanceRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/ambulance/booking/:bookingId
const getBookingAmbulanceRequests = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const requests = await AmbulanceRequest.find({ bookingId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("getBookingAmbulanceRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/ambulance/all  (admin)
const getAllAmbulanceRequests = async (req, res) => {
  try {
    const requests = await AmbulanceRequest.find({})
      .sort({ createdAt: -1 })
      .populate("patientId", "name email phone")
      .populate("requestedByUserId", "name role")
      .populate("bookingId", "service date")
      .lean();
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("getAllAmbulanceRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// PUT /api/ambulance/status/:id  (admin)
const updateAmbulanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["requested", "dispatched", "arrived", "completed", "cancelled"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }
    const updated = await AmbulanceRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Request not found." });
    return res.json({ success: true, message: "Status updated.", data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  createAmbulanceRequest,
  getPatientAmbulanceRequests,
  getBookingAmbulanceRequests,
  getAllAmbulanceRequests,
  updateAmbulanceStatus,
};
