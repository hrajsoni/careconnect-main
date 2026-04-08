const CareAssistantRequest = require("../models/CareAssistantRequest");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const ROLES = require("../constants/roles");
const { sendSuccess, sendError } = require("../utils/response");

// Strips HTML tags and trims whitespace from user-submitted text.
const sanitize = (str) =>
  typeof str === 'string' ? str.trim().replace(/<[^>]*>/g, '') : str;

const prettyRequestType = (type) => {
  const map = {
    doctor_visit: "Doctor Visit Assistance",
    medical_followup: "Medical Follow-up Support",
    pickup_drop: "Pickup & Drop Support",
    hospital_discharge: "Hospital Discharge Assistance",
    general_assistance: "General Assistance",
  };

  return map[type] || type;
};

const sanitizeRequest = (request) => ({
  _id: request._id,
  patient: request.patient,
  careAssistant: request.careAssistant,
  requestType: request.requestType,
  scheduledDate: request.scheduledDate,
  scheduledTime: request.scheduledTime,
  pickupLocation: request.pickupLocation,
  destination: request.destination,
  notes: request.notes,
  status: request.status,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

// ============================================================
// FIXED: State machine for care assistant request transitions
// Previously: any status could transition to any other status
// e.g. completed → in_progress was allowed (should be impossible)
// Now: only valid transitions are permitted
// ============================================================
const VALID_STATUS_TRANSITIONS = {
  pending:     ["accepted", "cancelled"],
  accepted:    ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],  // Terminal — no further transitions allowed
  cancelled:   [],  // Terminal — no further transitions allowed
};

exports.createRequest = async (req, res) => {
  try {
    const {
      requestType,
      scheduledDate,
      scheduledTime,
      pickupLocation,
      destination,
      notes,
    } = req.body;

    if (
      !requestType ||
      !scheduledDate ||
      !scheduledTime ||
      !pickupLocation ||
      !destination
    ) {
      return sendError(res, "Please fill all required fields", 400);
    }

    const patient = await User.findById(req.user.id);

    if (!patient || patient.role !== "patient") {
      return sendError(res, "Valid patient not found", 404);
    }

    const request = await CareAssistantRequest.create({
      patient: req.user.id,
      requestType,
      scheduledDate,
      scheduledTime,
      pickupLocation: sanitize(pickupLocation),
      destination:    sanitize(destination),
      notes:          sanitize(notes) || "",
      status: "pending",
    });

    if (patient.email) {
      await sendEmail({
        to: patient.email,
        subject: "CareConnect Care Assistant Request Created",
        text: `Your care assistant request for ${prettyRequestType(
          requestType
        )} on ${scheduledDate} at ${scheduledTime} has been created successfully.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Care assistant request created</h2>
            <p>Hello ${patient.name},</p>
            <p>Your request has been created successfully.</p>
            <ul>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                requestType
              )}</li>
              <li><strong>Date:</strong> ${scheduledDate}</li>
              <li><strong>Time:</strong> ${scheduledTime}</li>
              <li><strong>Pickup:</strong> ${pickupLocation}</li>
              <li><strong>Destination:</strong> ${destination}</li>
            </ul>
            <p>You can track the request status from your dashboard.</p>
          </div>
        `,
      });
    }

    return sendSuccess(res, sanitizeRequest(request), "Care assistant request created successfully", 201);
  } catch (error) {
    console.error("CREATE CARE ASSISTANT REQUEST ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.getPatientRequests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { patient: patientId };

    const [requests, total] = await Promise.all([
      CareAssistantRequest.find(query)
        .skip(skip).limit(limit)
        .populate("careAssistant", "name email phone photo location role")
        .sort({ createdAt: -1 }),
      CareAssistantRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET PATIENT REQUESTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.getOpenRequestsForAssistants = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { status: "pending", careAssistant: null };

    const [requests, total] = await Promise.all([
      CareAssistantRequest.find(query)
        .skip(skip).limit(limit)
        .populate("patient", "name phone location photo")
        .sort({ createdAt: -1 }),
      CareAssistantRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET OPEN REQUESTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.getAssistantRequests = async (req, res) => {
  try {
    const { assistantId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = { careAssistant: assistantId };

    const [requests, total] = await Promise.all([
      CareAssistantRequest.find(query)
        .skip(skip).limit(limit)
        .populate("patient", "name phone location photo email")
        .sort({ createdAt: -1 }),
      CareAssistantRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET ASSISTANT REQUESTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const assistantId = req.user.id;

    const assistant = await User.findById(assistantId);

    if (!assistant || assistant.role !== ROLES.CARE_ASSISTANT) {
      return sendError(res, "Valid care assistant not found", 404);
    }

    if (!assistant.isApproved || assistant.verificationStatus !== "approved") {
      return sendError(res, "Only approved care assistants can accept requests", 403);
    }

    // ============================================================
    // FIXED: Atomic assignment using findOneAndUpdate
    // Previously: find → check → save (two separate operations)
    // Race condition: Assistant A and B both read status "pending"
    // both pass the check, both save — request assigned to both
    //
    // Now: single atomic operation with filter conditions
    // MongoDB only updates if BOTH conditions are true at the
    // exact moment of the write — if another assistant claimed
    // it first, this returns null and we return 409 Conflict
    // ============================================================
    const request = await CareAssistantRequest.findOneAndUpdate(
      {
        _id: requestId,
        status: "pending",       // Only matches if still pending
        careAssistant: null,     // Only matches if still unassigned
      },
      {
        careAssistant: assistantId,
        status: "accepted",
      },
      {
        new: true,               // Return the updated document
      }
    );

    // If null: either request doesn't exist OR was already claimed
    // by another assistant between our check and this write
    if (!request) {
      // Check if request exists at all to give accurate error message
      const exists = await CareAssistantRequest.findById(requestId);

      if (!exists) {
        return sendError(res, "Request not found", 404);
      }

      return sendError(res, "This request is no longer available", 409);
    }

    const populated = await CareAssistantRequest.findById(request._id)
      .populate("patient", "name phone location photo email")
      .populate("careAssistant", "name email phone photo location role");

    if (populated?.patient?.email) {
      await sendEmail({
        to: populated.patient.email,
        subject: "CareConnect Request Accepted",
        text: `${assistant.name} has accepted your care assistant request for ${prettyRequestType(
          populated.requestType
        )}.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Your request has been accepted</h2>
            <p>Hello ${populated.patient.name},</p>
            <p>Your care assistant request has been accepted.</p>
            <ul>
              <li><strong>Assistant:</strong> ${assistant.name}</li>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                populated.requestType
              )}</li>
              <li><strong>Date:</strong> ${populated.scheduledDate}</li>
              <li><strong>Time:</strong> ${populated.scheduledTime}</li>
            </ul>
          </div>
        `,
      });
    }

    if (assistant.email) {
      await sendEmail({
        to: assistant.email,
        subject: "CareConnect Request Assigned",
        text: `You have accepted a new request for ${prettyRequestType(
          populated.requestType
        )}.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>You accepted a care request</h2>
            <p>Hello ${assistant.name},</p>
            <p>You have accepted a new patient support request.</p>
            <ul>
              <li><strong>Patient:</strong> ${populated.patient?.name || "Patient"}</li>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                populated.requestType
              )}</li>
              <li><strong>Date:</strong> ${populated.scheduledDate}</li>
              <li><strong>Time:</strong> ${populated.scheduledTime}</li>
            </ul>
          </div>
        `,
      });
    }

    return sendSuccess(res, populated, "Request accepted successfully");
  } catch (error) {
    console.error("ACCEPT REQUEST ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const assistantId = req.user.id;

    const allowedStatuses = ["in_progress", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, "Invalid status", 400);
    }

    // ============================================================
    // FIXED: Approval check — mirrors the check in acceptRequest
    // Previously: a suspended/unapproved assistant could still
    // push their assigned requests to in_progress / completed
    // Now: only approved assistants can mutate request state
    // ============================================================
    const assistant = await User.findById(assistantId);

    if (!assistant || assistant.role !== ROLES.CARE_ASSISTANT) {
      return sendError(res, "Valid care assistant not found", 404);
    }

    if (!assistant.isApproved || assistant.verificationStatus !== "approved") {
      return sendError(res, "Only approved care assistants can update request status", 403);
    }

    const request = await CareAssistantRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (
      !request.careAssistant ||
      request.careAssistant.toString() !== assistantId
    ) {
      return sendError(res, "Not authorized to update this request", 403);
    }

    // ============================================================
    // FIXED: State machine validation
    // Previously: any status → any status was allowed
    // e.g. completed → in_progress, cancelled → completed
    // Now: only valid transitions are permitted per state machine
    // ============================================================
    const allowedTransitions = VALID_STATUS_TRANSITIONS[request.status] || [];

    if (!allowedTransitions.includes(status)) {
      return sendError(res, `Cannot transition request from '${request.status}' to '${status}'`, 400);
    }

    request.status = status;
    await request.save();

    const populated = await CareAssistantRequest.findById(request._id)
      .populate("patient", "name phone location photo email")
      .populate("careAssistant", "name email phone photo location role");

    if (populated?.patient?.email) {
      await sendEmail({
        to: populated.patient.email,
        subject: `CareConnect Request ${
          status === "completed"
            ? "Completed"
            : status === "in_progress"
            ? "Started"
            : "Cancelled"
        }`,
        text: `Your care assistant request for ${prettyRequestType(
          populated.requestType
        )} has been marked as ${status}.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Request status updated</h2>
            <p>Hello ${populated.patient.name},</p>
            <p>Your care assistant request has been marked as <strong>${status}</strong>.</p>
            <ul>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                populated.requestType
              )}</li>
              <li><strong>Date:</strong> ${populated.scheduledDate}</li>
              <li><strong>Time:</strong> ${populated.scheduledTime}</li>
            </ul>
          </div>
        `,
      });
    }

    if (populated?.careAssistant?.email) {
      await sendEmail({
        to: populated.careAssistant.email,
        subject: `CareConnect Request ${
          status === "completed"
            ? "Completed"
            : status === "in_progress"
            ? "Started"
            : "Cancelled"
        }`,
        text: `The request you accepted for ${prettyRequestType(
          populated.requestType
        )} has been marked as ${status}.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Assigned request updated</h2>
            <p>Hello ${populated.careAssistant.name},</p>
            <p>The request has been marked as <strong>${status}</strong>.</p>
            <ul>
              <li><strong>Patient:</strong> ${populated.patient?.name || "Patient"}</li>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                populated.requestType
              )}</li>
            </ul>
          </div>
        `,
      });
    }

    return sendSuccess(res, populated, `Request marked as ${status}`);
  } catch (error) {
    console.error("UPDATE REQUEST STATUS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.cancelPatientRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await CareAssistantRequest.findById(requestId)
      .populate("patient", "name email")
      .populate("careAssistant", "name email");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.patient?._id?.toString() !== req.user.id) {
      return sendError(res, "Not authorized to cancel this request", 403);
    }

    if (request.status !== "pending") {
      return sendError(res, "Only pending requests can be cancelled by patient", 400);
    }

    request.status = "cancelled";
    await request.save();

    if (request.patient?.email) {
      await sendEmail({
        to: request.patient.email,
        subject: "CareConnect Request Cancelled",
        text: `Your care assistant request for ${prettyRequestType(
          request.requestType
        )} has been cancelled successfully.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Request cancelled</h2>
            <p>Hello ${request.patient.name},</p>
            <p>Your care assistant request has been cancelled successfully.</p>
            <ul>
              <li><strong>Request Type:</strong> ${prettyRequestType(
                request.requestType
              )}</li>
              <li><strong>Date:</strong> ${request.scheduledDate}</li>
              <li><strong>Time:</strong> ${request.scheduledTime}</li>
            </ul>
          </div>
        `,
      });
    }

    return sendSuccess(res, request, "Request cancelled successfully");
  } catch (error) {
    console.error("PATIENT CANCEL REQUEST ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.getAllRequestsForAdmin = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const query = {};

    const [requests, total] = await Promise.all([
      CareAssistantRequest.find(query)
        .skip(skip).limit(limit)
        .populate("patient", "name email phone location photo")
        .populate("careAssistant", "name email phone location photo role")
        .sort({ createdAt: -1 }),
      CareAssistantRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN GET REQUESTS ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};