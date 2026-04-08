const express = require("express");
const router = express.Router();
const {
createRequest,
getPatientRequests,
getOpenRequestsForAssistants,
getAssistantRequests,
acceptRequest,
updateRequestStatus,
cancelPatientRequest,
getAllRequestsForAdmin,
} = require("../controllers/careAssistantRequestController");
const {
requireAuth,
requireRole,
requireApprovedProvider,
} = require("../middleware/auth");
const ROLES = require("../constants/roles");

router.post("/", requireAuth, requireRole(ROLES.PATIENT), createRequest);

router.get("/patient/:patientId", requireAuth, requireRole(ROLES.PATIENT, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.PATIENT && req.user.id !== req.params.patientId) {
return res.status(403).json({
success: false,
message: "You can only view your own requests",
});
}
next();
}, getPatientRequests);

router.get(
"/open",
requireAuth,
requireRole(ROLES.CARE_ASSISTANT),
requireApprovedProvider,
getOpenRequestsForAssistants
);

router.get("/assistant/:assistantId", requireAuth, requireRole(ROLES.CARE_ASSISTANT, ROLES.ADMIN), (req, res, next) => {
if (req.user.role === ROLES.CARE_ASSISTANT && req.user.id !== req.params.assistantId) {
return res.status(403).json({
success: false,
message: "You can only view your own assigned requests",
});
}
next();
}, getAssistantRequests);

router.put(
"/accept/:requestId",
requireAuth,
requireRole(ROLES.CARE_ASSISTANT),
requireApprovedProvider,
acceptRequest
);

router.put(
"/status/:requestId",
requireAuth,
requireRole(ROLES.CARE_ASSISTANT),
requireApprovedProvider,
updateRequestStatus
);

router.put(
"/patient-cancel/:requestId",
requireAuth,
requireRole(ROLES.PATIENT),
cancelPatientRequest
);

router.get(
"/admin/all",
requireAuth,
requireRole(ROLES.ADMIN),
getAllRequestsForAdmin
);

module.exports = router;
