const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const ROLES = require("../constants/roles");
const { sendSuccess, sendError } = require("../utils/response");
const { getFixedPrice } = require("../constants/pricing");
const {
  genericBookingTemplate,
  paymentTemplate,
} = require("../utils/emailTemplates");

const populateBookingQuery = (query) => {
  return query
    .populate("patientId", "name phone location role")
    .populate(
      "nurseId",
      "name email phone location role qualification experience services servicePrices availability isApproved verificationStatus"
    )
    .sort({ createdAt: -1 });
};


// Strips HTML tags and trims whitespace from user-submitted text.
// Applied to free-text fields before saving to prevent stored XSS.
// Do NOT apply to emails, passwords, IDs, or structured data.
const sanitize = (str) =>
  typeof str === 'string' ? str.trim().replace(/<[^>]*>/g, '') : str;

const getDayNameFromDate = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", { weekday: "long" });
};

// ============================================================
// FIXED: State machine for booking status transitions
// Previously: any status could transition to any other status
// e.g. completed → pending was allowed (should be impossible)
// Now: only valid transitions are permitted
// ============================================================
const VALID_STATUS_TRANSITIONS = {
  pending: ["accepted", "cancelled"],
  accepted: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],  // Terminal — no further transitions allowed
  cancelled: [],  // Terminal — no further transitions allowed
};

const notifyBookingCreated = async (booking, payment) => {
  try {
    const patient = booking.patientId;
    const nurse = booking.nurseId;

    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Booking Created",
        text: `Your booking for ${booking.service} on ${booking.date} at ${booking.time} has been created successfully.`,
        html: genericBookingTemplate({
          title: "Booking Created",
          intro: `Hello ${patient.name}, your booking has been created successfully.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }

    if (nurse?.email) {
      await sendEmail({
        to: nurse.email,
        subject: "CareConnect New Booking Request",
        text: `A new booking request has been created for ${booking.service} on ${booking.date} at ${booking.time}.`,
        html: genericBookingTemplate({
          title: "New Booking Request",
          intro: `Hello ${nurse.name}, you have received a new booking request.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }

    if (patient?.email && payment) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Payment Record Created",
        text: `A payment record has been created for your booking. Amount: ₹${payment.amount}.`,
        html: paymentTemplate({
          name: patient.name,
          amount: payment.amount,
          service: booking.service || payment.service || "Service",
          status: payment.status,
        }),
      });
    }
  } catch (error) {
    console.error("BOOKING CREATED EMAIL ERROR:", error);
  }
};

const notifyBookingStatusUpdate = async (booking) => {
  try {
    const patient = booking.patientId;
    const nurse = booking.nurseId;

    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Booking Status Updated",
        text: `Your booking status for ${booking.service} has been updated to ${booking.status}.`,
        html: genericBookingTemplate({
          title: "Booking Status Updated",
          intro: `Hello ${patient.name}, your booking status has been updated.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }

    if (nurse?.email) {
      await sendEmail({
        to: nurse.email,
        subject: "CareConnect Booking Status Updated",
        text: `A booking status for ${booking.service} has been updated to ${booking.status}.`,
        html: genericBookingTemplate({
          title: "Booking Status Updated",
          intro: `Hello ${nurse.name}, a booking linked to your account has been updated.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }
  } catch (error) {
    console.error("BOOKING STATUS EMAIL ERROR:", error);
  }
};

const notifyBookingUpdated = async (booking) => {
  try {
    const patient = booking.patientId;
    const nurse = booking.nurseId;

    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Booking Updated",
        text: `Your booking for ${booking.service} has been updated.`,
        html: genericBookingTemplate({
          title: "Booking Updated",
          intro: `Hello ${patient.name}, your booking details have been updated successfully.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }

    if (nurse?.email) {
      await sendEmail({
        to: nurse.email,
        subject: "CareConnect Booking Updated",
        text: `A booking assigned to you for ${booking.service} has been updated.`,
        html: genericBookingTemplate({
          title: "Booking Updated",
          intro: `Hello ${nurse.name}, a patient booking assigned to you has been updated.`,
          service: booking.service,
          date: booking.date,
          time: booking.time,
          location: booking.location,
          status: booking.status,
        }),
      });
    }
  } catch (error) {
    console.error("BOOKING UPDATED EMAIL ERROR:", error);
  }
};

/*
========================================
GET ALL BOOKINGS (ADMIN)
========================================
*/
exports.getAllBookings = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = {};

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip).limit(limit)
        .populate("patientId", "name phone location role")
        .populate("nurseId", "name email phone location role qualification experience services servicePrices availability isApproved verificationStatus")
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
    console.error("GET ALL BOOKINGS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
GET BOOKINGS FOR NURSE
========================================
*/
exports.getNurseBookings = async (req, res) => {
  try {
    const { nurseId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { nurseId };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip).limit(limit)
        .populate("patientId", "name phone location role")
        .populate("nurseId", "name email phone location role qualification experience services servicePrices availability isApproved verificationStatus")
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Nurse bookings fetched successfully",
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET NURSE BOOKINGS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
GET BOOKINGS FOR PATIENT
========================================
*/
exports.getPatientBookings = async (req, res) => {
  try {
    const { patientId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { patientId };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip).limit(limit)
        .populate("patientId", "name phone location role")
        .populate("nurseId", "name email phone location role qualification experience services servicePrices availability isApproved verificationStatus")
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Patient bookings fetched successfully",
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET PATIENT BOOKINGS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
CREATE BOOKING
========================================
*/
exports.createBooking = async (req, res) => {
  try {
    const {
      nurseId,
      service,
      date,
      time,
      location,
      notes,
    } = req.body;

    // ============================================================
    // FIXED: patientId always comes from the authenticated token
    // Previously: patientId taken from req.body — any patient
    // could book on behalf of another patient (financial fraud)
    // Now: req.user.id is set by requireAuth middleware from the
    // verified JWT — cannot be spoofed from request body
    // ============================================================
    const patientId = req.user.id;

    if (!nurseId || !service || !date || !time || !location) {
      return sendError(res, "Nurse, service, date, time, and location are required", 400);
    }

    const nurse = await User.findById(nurseId);

    if (!nurse) {
      return sendError(res, "Nurse not found", 404);
    }

    if (nurse.role !== "nurse") {
      return sendError(res, "Selected provider is not a nurse", 400);
    }

    if (!nurse.isApproved || nurse.verificationStatus !== "approved") {
      return sendError(res, "This nurse is not approved for booking yet", 400);
    }

    if (!Array.isArray(nurse.services) || !nurse.services.includes(service)) {
      return sendError(res, "Selected service is not offered by this nurse", 400);
    }

    const availability = nurse.availability || {};
    const availableDays = Array.isArray(availability.availableDays)
      ? availability.availableDays
      : [];

    if (!availability.isAvailableForBooking) {
      return sendError(res, "This nurse is currently not accepting new bookings", 400);
    }

    if (
      availableDays.length === 0 ||
      !availability.startTime ||
      !availability.endTime
    ) {
      return sendError(res, "This nurse has not configured availability yet", 400);
    }

    const selectedDayName = getDayNameFromDate(date);
    if (!selectedDayName || !availableDays.includes(selectedDayName)) {
      return sendError(res, `This nurse is not available on ${selectedDayName || "the selected date"}`, 400);
    }

    // Parse HH:MM strings to Date for correct numeric comparison
    const toDate = (t) => new Date('1970-01-01T' + t + ':00');
    if (toDate(time) < toDate(availability.startTime) || toDate(time) > toDate(availability.endTime)) {
      return sendError(res, "Selected time is outside the nurse's available hours", 400);
    }

    const existingBooking = await Booking.findOne({
      nurseId,
      date,
      time,
      status: { $in: ["pending", "accepted", "in_progress"] },
    });

    if (existingBooking) {
      return sendError(res, "This slot is already booked. Please select another time.", 400);
    }

    const paymentAmount = getFixedPrice(service);

    const booking = new Booking({
      patientId,
      nurseId,
      service,
      date,
      time,
      location: sanitize(location),
      notes: sanitize(notes) || "",
      paymentAmount,
      paymentMethod: "online",
      paymentStatus: "pending",
      status: "pending",
    });

    const payment = new Payment({
      bookingId: booking._id,
      patientId,
      nurseId,
      amount: paymentAmount,
      service: service,
      method: "online",
      status: "pending",
      gateway: "manual",
    });

    // Wrap both saves in a transaction so a payment failure
    // doesn't leave an orphaned booking in the database
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await booking.save({ session });
        await payment.save({ session });
      });
    } finally {
      session.endSession();
    }

    const populatedBooking = await populateBookingQuery(
      Booking.findById(booking._id)
    );

    await notifyBookingCreated(populatedBooking, payment);

    return sendSuccess(res, { booking: populatedBooking, payment }, "Booking created successfully", 201);
  } catch (error) {
    console.error("CREATE BOOKING ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
UPDATE BOOKING STATUS
========================================
*/
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const allowedStatuses = ["pending", "accepted", "in_progress", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, "Invalid booking status", 400);
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return sendError(res, "Booking not found", 404);
    }

    // ============================================================
    // FIXED: Ownership check
    // Previously: any nurse could update any booking's status
    // allowing one nurse to complete another nurse's bookings
    // Now: only the assigned nurse or admin can update status
    // ============================================================
    if (
      req.user.role === ROLES.NURSE &&
      booking.nurseId.toString() !== req.user.id
    ) {
      return sendError(res, "You can only update status for your own bookings", 403);
    }

    // ============================================================
    // FIXED: State machine validation
    // Previously: any status → any status was allowed
    // e.g. completed → pending, cancelled → accepted
    // Now: only valid transitions are permitted per state machine
    // ============================================================
    const allowedTransitions = VALID_STATUS_TRANSITIONS[booking.status] || [];

    if (!allowedTransitions.includes(status)) {
      return sendError(res, `Cannot transition booking from '${booking.status}' to '${status}'`, 400);
    }

    booking.status = status;
    if (status === "cancelled") {
      booking.cancellationReason = cancellationReason?.trim() || booking.cancellationReason || "";
    }
    await booking.save();

    const updatedBooking = await populateBookingQuery(
      Booking.findById(booking._id)
    );

    await notifyBookingStatusUpdate(updatedBooking);

    return sendSuccess(res, updatedBooking, "Booking status updated successfully");
  } catch (error) {
    console.error("UPDATE BOOKING STATUS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
UPDATE VISIT SUMMARY
========================================
*/
exports.updateVisitSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bloodPressure,
      temperature,
      sugarLevel,
      oxygenLevel,
      pulseRate,
      treatmentProvided,
      notes,
      followUpRequired,
      followUpNotes,
      status,
    } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return sendError(res, "Booking not found", 404);
    }

    // ============================================================
    // FIXED: Ownership check for visit summary
    // Previously: any nurse could update any booking's summary
    // Now: only the assigned nurse or admin can update summary
    // ============================================================
    if (
      req.user.role === ROLES.NURSE &&
      booking.nurseId.toString() !== req.user.id
    ) {
      return sendError(res, "You can only update visit summaries for your own bookings", 403);
    }

    booking.visitSummary = {
      bloodPressure:      sanitize(bloodPressure)      || "",
      temperature:        sanitize(temperature)        || "",
      sugarLevel:         sanitize(sugarLevel)         || "",
      oxygenLevel:        sanitize(oxygenLevel)        || "",
      pulseRate:          sanitize(pulseRate)          || "",
      treatmentProvided:  sanitize(treatmentProvided)  || "",
      notes:              sanitize(notes)              || "",
      // FIXED: !!followUpRequired converts string "false" → true (bug)
      // Now only boolean true or string "true" is treated as truthy
      followUpRequired: followUpRequired === true || followUpRequired === 'true',
      followUpNotes:    sanitize(followUpNotes)        || "",
      updatedAt: new Date(),
    };

    if (status) {
      const allowedStatuses = ["accepted", "in_progress", "completed", "cancelled"];
      if (!allowedStatuses.includes(status)) {
        return sendError(res, "Invalid booking status in visit summary", 400);
      }

      if (status !== booking.status) {
        const allowedTransitions = VALID_STATUS_TRANSITIONS[booking.status] || [];
        if (!allowedTransitions.includes(status)) {
          return sendError(
            res,
            `Cannot transition booking from '${booking.status}' to '${status}'`,
            400
          );
        }
      }

      booking.status = status;
    }

    await booking.save();

    const updatedBooking = await populateBookingQuery(
      Booking.findById(booking._id)
    );

    await notifyBookingStatusUpdate(updatedBooking);

    return sendSuccess(res, updatedBooking, "Visit summary updated successfully");
  } catch (error) {
    console.error("UPDATE VISIT SUMMARY ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
UPDATE BOOKING (PATIENT)
========================================
*/
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, location, notes } = req.body;

    const booking = await Booking.findById(id).populate("nurseId");

    if (!booking) {
      return sendError(res, "Booking not found", 404);
    }

    // ============================================================
    // FIXED: Ownership check for booking update
    // Previously: any patient could edit any booking
    // Now: only the patient who owns the booking can edit it
    // Admin can edit any booking
    // ============================================================
    if (
      req.user.role === ROLES.PATIENT &&
      booking.patientId.toString() !== req.user.id
    ) {
      return sendError(res, "You can only update your own bookings", 403);
    }

    if (["in_progress", "completed", "cancelled"].includes(booking.status)) {
      return sendError(
        res,
        "In-progress, completed, or cancelled bookings cannot be modified",
        400
      );
    }

    const nurse = booking.nurseId;
    const availability = nurse?.availability || {};
    const availableDays = Array.isArray(availability.availableDays)
      ? availability.availableDays
      : [];

    const nextDate = date || booking.date;
    const nextTime = time || booking.time;

    const selectedDayName = getDayNameFromDate(nextDate);
    if (!selectedDayName || !availableDays.includes(selectedDayName)) {
      return res.status(400).json({
        success: false,
        message: `This nurse is not available on ${selectedDayName || "the selected date"}`,
      });
    }

    if (
      availability.startTime &&
      availability.endTime &&
      (nextTime < availability.startTime || nextTime > availability.endTime)
    ) {
      return sendError(res, "Selected time is outside the nurse's available hours", 400);
    }

    const conflictingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      nurseId: booking.nurseId._id,
      date: nextDate,
      time: nextTime,
      status: { $in: ["pending", "accepted", "in_progress"] },
    });

    if (conflictingBooking) {
      return sendError(res, "Selected slot is already booked", 400);
    }

    booking.date = nextDate;
    booking.time = nextTime;
    booking.location = location != null ? sanitize(location) : booking.location;
    booking.notes    = notes    != null ? sanitize(notes)    : booking.notes;

    await booking.save();

    const updatedBooking = await populateBookingQuery(
      Booking.findById(booking._id)
    );

    await notifyBookingUpdated(updatedBooking);

    return sendSuccess(res, updatedBooking, "Booking updated successfully");
  } catch (error) {
    console.error("UPDATE BOOKING ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
CANCEL BOOKING (PATIENT)
========================================
*/
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return sendError(res, "Booking not found", 404);
    }

    // ============================================================
    // FIXED: Ownership check for cancellation
    // Previously: any patient could cancel any booking
    // Now: only the patient who owns the booking can cancel it
    // Admin can cancel any booking
    // ============================================================
    if (
      req.user.role === ROLES.PATIENT &&
      booking.patientId.toString() !== req.user.id
    ) {
      return sendError(res, "You can only cancel your own bookings", 403);
    }

    if (["in_progress", "completed"].includes(booking.status)) {
      return sendError(res, "In-progress or completed bookings cannot be cancelled", 400);
    }

    booking.status = "cancelled";
    booking.cancellationReason = cancellationReason || "";
    await booking.save();

    const updatedBooking = await populateBookingQuery(
      Booking.findById(booking._id)
    );

    await notifyBookingStatusUpdate(updatedBooking);

    return sendSuccess(res, updatedBooking, "Booking cancelled successfully");
  } catch (error) {
    console.error("CANCEL BOOKING ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};
