const express = require("express");
const {
  getAllServices,
  getAdminServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const { requireAuth, requireRole } = require("../middleware/auth");
const ROLES = require("../constants/roles");

const router = express.Router();

router.get("/", getAllServices);

router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));
router.get("/admin", getAdminServices);
router.post("/", createService);
router.put("/:id", updateService);
router.delete("/:id", deleteService);

module.exports = router;
