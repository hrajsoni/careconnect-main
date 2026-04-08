const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ROLES = require("../constants/roles");

// FIXED: No fallback — if JWT_SECRET missing, crash immediately
// A running server with no secret is more dangerous than a crashed one
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
  console.error("Set it in your .env file and restart the server.");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

const requireAuth = async (req, res, next) => {
  try {
    // ============================================================
    // FIXED: Now reads token from cookie OR Authorization header
    // Priority: cookie first (more secure), header as fallback
    // This allows both old frontend calls (Bearer token) and new
    // cookie-based calls to work during the migration period
    //
    // Once frontend migration is complete, the header fallback
    // can be removed and only cookie auth will be accepted
    // ============================================================
    let token = null;

    // Check HTTPOnly cookie first (set by login endpoint)
    if (req.cookies?.authToken) {
      token = req.cookies.authToken;
    }

    // Fall back to Authorization header (for migration period)
    if (!token) {
      const authHeader = req.headers.authorization || "";
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token user",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      isApproved: user.isApproved,
      verificationStatus: user.verificationStatus,
    };

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
};

const requireApprovedProvider = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (![ROLES.NURSE, ROLES.CARE_ASSISTANT].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only providers can access this route",
    });
  }

  if (!req.user.isApproved || req.user.verificationStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Your account is not approved yet",
    });
  }

  next();
};

module.exports = {
  requireAuth,
  requireRole,
  requireApprovedProvider,
};