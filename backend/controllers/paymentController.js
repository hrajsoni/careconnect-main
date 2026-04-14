const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");
const { paymentTemplate } = require("../utils/emailTemplates");
const ROLES = require("../constants/roles");
const { sendSuccess, sendError } = require("../utils/response");


/*
========================================
HELPER: FORMAT PAYMENT FOR API RESPONSE
Maps internal model field names to standard API field names.
Does NOT modify the database document — output only.
========================================
*/
const formatPayment = (payment) => ({
  ...payment.toObject(),
  paymentMethod: payment.method,
  transactionId: payment.reference,
  service: payment.gateway,
});

const notifyPaymentMarkedPaid = async (payment) => {
  try {
    const patient = payment.patientId;
    const nurse = payment.nurseId;
    const booking = payment.bookingId;

    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Payment Successful",
        text: `Your payment for ${booking?.service || "booking"} has been marked as paid.`,
        html: paymentTemplate({
          name: patient.name,
          amount: payment.amount,
          service: booking?.service || payment.service || "Service",
          status: payment.status,
        }),
      });
    }

    if (nurse?.email) {
      await sendEmail({
        to: nurse.email,
        subject: "CareConnect Booking Payment Received",
        text: `Payment for a booking assigned to you has been marked as paid.`,
        html: paymentTemplate({
          name: nurse.name,
          amount: payment.amount,
          service: booking?.service || payment.service || "Service",
          status: payment.status,
        }),
      });
    }
  } catch (error) {
    console.error("PAYMENT EMAIL ERROR:", error);
  }
};

/*
========================================
GET ALL PAYMENTS FOR ADMIN
========================================
*/
exports.getAllPayments = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
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
      data: payments.map(formatPayment),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET ALL PAYMENTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
GET PAYMENTS FOR NURSE
========================================
*/
exports.getNursePayments = async (req, res) => {
  try {
    const { nurseId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { nurseId };

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
      message: "Nurse payments fetched successfully",
      data: payments.map(formatPayment),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET NURSE PAYMENTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
GET PAYMENTS FOR PATIENT
========================================
*/
exports.getPatientPayments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { patientId };

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
      message: "Patient payments fetched successfully",
      data: payments.map(formatPayment),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET PATIENT PAYMENTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
MARK PAYMENT AS PAID (MVP MANUAL)
========================================
*/
exports.markPaymentAsPaid = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reference, method } = req.body;

    // ============================================================
    // FIXED: Fetch payment with booking populated for ownership check
    // Previously: payment fetched without booking, no ownership check
    // Any patient could mark any other patient's payment as paid
    // ============================================================
    const payment = await Payment.findById(paymentId).populate("bookingId");

    if (!payment) {
      return sendError(res, "Payment record not found", 404);
    }

    // ============================================================
    // FIXED: Ownership check
    // Previously: any patient or admin could mark ANY payment paid
    // enabling fraud — mark someone else's payment without paying
    // Now: patients can only mark their own payments as paid
    // Admins can mark any payment as paid
    // ============================================================
    if (
      req.user.role === ROLES.PATIENT &&
      payment.patientId.toString() !== req.user.id
    ) {
      return sendError(res, "You can only mark your own payments as paid", 403);
    }

    // ============================================================
    // FIXED: State validation — only pending payments can be marked paid
    // Previously: partially checked (only blocked "paid" → "paid")
    // Now: explicitly only allows pending → paid transition
    // Prevents marking failed/refunded payments as paid
    // ============================================================
    if (payment.status !== "pending") {
      return sendError(res, `Payment cannot be marked as paid — current status is '${payment.status}'`, 400);
    }

    // ============================================================
    // Revenue split: 70% to nurse, 30% platform fee
    // Stored in the payment record for auditability
    // ============================================================
    const NURSE_SHARE = 0.70;
    const PLATFORM_SHARE = 0.30;
    const nurseEarnings = Math.round(payment.amount * NURSE_SHARE * 100) / 100;
    const platformFee   = Math.round(payment.amount * PLATFORM_SHARE * 100) / 100;

    payment.status = "paid";
    payment.method = method || payment.method || "online";
    payment.reference = reference || `CC-${Date.now()}`;
    payment.paidAt = new Date();
    payment.nurseEarnings = nurseEarnings;
    payment.platformFee = platformFee;

    await payment.save();

    const booking = await Booking.findById(payment.bookingId);

    if (booking) {
      booking.paymentStatus = "paid";
      booking.paymentMethod = payment.method;
      booking.paymentReference = payment.reference;
      booking.paymentAmount = payment.amount;
      booking.paidAt = payment.paidAt;

      await booking.save();
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate(
        "bookingId",
        "service date time location status paymentStatus paymentMethod paymentReference paymentAmount paidAt"
      )
      .populate("patientId", "name email phone")
      .populate("nurseId", "name email phone");

    await notifyPaymentMarkedPaid(updatedPayment);

    return sendSuccess(res, {
      payment: formatPayment(updatedPayment),
      booking,
      nurseEarnings,
      platformFee,
    }, "Payment marked as paid successfully");
  } catch (error) {
    console.error("MARK PAYMENT AS PAID ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};


/*
========================================
CREATE PAYMENT (PATIENT)
========================================
*/
exports.createPayment = async (req, res) => {
  try {
    const { bookingId, amount, service, nurseId } = req.body;
    const patientId = req.user.id;

    if (!bookingId || !amount || !nurseId) {
      return sendError(res, "bookingId, amount, and nurseId are required", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendError(res, "Booking not found", 404);
    }

    if (booking.patientId.toString() !== patientId) {
      return sendError(res, "You can only create payments for your own bookings", 403);
    }

    if (nurseId && booking.nurseId.toString() !== String(nurseId)) {
      return sendError(res, "Invalid nurse for selected booking", 400);
    }

    const existingPayment = await Payment.findOne({ bookingId });
    if (existingPayment) {
      return sendError(res, "Payment already exists for this booking", 409);
    }

    const amountFromBooking = Number(booking.paymentAmount) || Number(amount) || 0;

    const payment = new Payment({
      bookingId,
      patientId,
      nurseId: booking.nurseId,
      amount: amountFromBooking,
      service: booking.service || service || "",
      method: "online",
      status: "pending",
      gateway: "manual",
    });

    await payment.save();

    const updatedPayment = await Payment.findById(payment._id)
      .populate(
        "bookingId",
        "service date time location status paymentStatus paymentMethod paymentReference paymentAmount paidAt"
      )
      .populate("patientId", "name email phone")
      .populate("nurseId", "name email phone");

    return sendSuccess(res, formatPayment(updatedPayment), "Payment created successfully", 201);
  } catch (error) {
    console.error("CREATE PAYMENT ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

/*
========================================
GET PAYMENT BY BOOKING ID
========================================
*/
exports.getPaymentByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const payment = await Payment.findOne({ bookingId })
      .populate(
        "bookingId",
        "service date time location status paymentStatus paymentMethod paymentReference paymentAmount paidAt"
      )
      .populate("patientId", "name email phone")
      .populate("nurseId", "name email phone");

    if (!payment) {
      return sendError(res, "Payment record not found for this booking", 404);
    }

    if (req.user.role === ROLES.PATIENT) {
      const ownerId = payment.patientId?._id?.toString() || payment.patientId?.toString();
      if (ownerId !== req.user.id) {
        return sendError(res, "You can only view your own booking payments", 403);
      }
    } else if (req.user.role === ROLES.NURSE) {
      const nurseId = payment.nurseId?._id?.toString() || payment.nurseId?.toString();
      if (nurseId !== req.user.id) {
        return sendError(res, "You can only view payments for your own bookings", 403);
      }
    } else if (req.user.role !== ROLES.ADMIN) {
      return sendError(res, "Not authorized to view this payment", 403);
    }

    return sendSuccess(res, formatPayment(payment), "Payment fetched successfully");
  } catch (error) {
    console.error("GET PAYMENT BY BOOKING ID ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};
