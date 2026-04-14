const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { signupWelcomeTemplate } = require("../utils/emailTemplates");
const ROLES = require("../constants/roles");
const { sendSuccess, sendError } = require("../utils/response");

const sanitize = (str) =>
  typeof str === "string" ? str.trim().replace(/<[^>]*>/g, "") : str;

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;
const IS_PROD = process.env.NODE_ENV === "production";

// Cookie options — cross-domain safe on production (Vercel + Render)
// SameSite=None + Secure=true is REQUIRED when frontend and backend
// are on different domains (e.g. .vercel.app vs .onrender.com)
// On localhost, lax/false is fine since both run on localhost
const cookieOptions = {
  httpOnly: true,
  secure: IS_PROD,                          // true on HTTPS (Render), false on localhost
  sameSite: IS_PROD ? "none" : "lax",      // "none" required for cross-domain
  maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days
};

const clearCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
};

const sanitizeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  location: user.location || "",
  role: user.role,
  isApproved: user.isApproved,
  verificationStatus: user.verificationStatus,
  rejectionReason: user.rejectionReason,
  qualification: user.qualification || "",
  experience: user.experience || 0,
  registrationNumber: user.registrationNumber || "",
  specialization: user.specialization || "",
  bio: user.bio || "",
  services: user.services || [],
  servicePrices: user.servicePrices || {},
  availability: user.availability || {},
  photo: user.photo || "",
  idProof: user.idProof || "",
  licenseProof: user.licenseProof || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

exports.signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      location,
      role,
      qualification,
      experience,
      registrationNumber,
      services,
      servicePrices,
    } = req.body;

    let parsedServices = [];
    let parsedServicePrices = {};
    if (services) {
      try {
        parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
      } catch (e) {
        parsedServices = [];
      }
    }
    if (servicePrices) {
      try {
        parsedServicePrices = typeof servicePrices === 'string' ? JSON.parse(servicePrices) : servicePrices;
      } catch (e) {
        parsedServicePrices = {};
      }
    }

    if (!name || !email || !password || !phone || !location) {
      return sendError(res, "Please fill all required fields", 400);
    }

    if (
      (role === ROLES.CARE_ASSISTANT || role === ROLES.NURSE) &&
      (!qualification || !experience || !registrationNumber)
    ) {
      return sendError(
        res,
        "Professional qualifications are required for this role",
        400
      );
    }

    const allowedRoles = Object.values(ROLES);
    const normalizedRole = allowedRoles.includes(role) ? role : ROLES.PATIENT;

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return sendError(res, "Phone number must be exactly 10 digits", 400);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return sendError(
        res,
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 symbol",
        400
      );
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return sendError(res, "User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const needsApproval =
      normalizedRole === ROLES.NURSE || normalizedRole === ROLES.CARE_ASSISTANT;

    const user = new User({
      name: sanitize(name),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      location: sanitize(location),
      role: normalizedRole,
      isApproved: !needsApproval,
      verificationStatus: null,      rejectionReason: "",
      photo: req.file ? req.file.path.replace(/\\/g, "/") : "",
      ...(normalizedRole === ROLES.CARE_ASSISTANT || normalizedRole === ROLES.NURSE
        ? {
            qualification: sanitize(qualification) || "",
            experience: parseInt(experience, 10) || 0,
            registrationNumber: registrationNumber?.trim() || "",
            services: parsedServices,
            servicePrices: parsedServicePrices,
          }
        : {}),
    });

    await user.save();

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Welcome to CareConnect",
        text: `Hello ${user.name}, your CareConnect account has been created successfully.`,
        html: signupWelcomeTemplate({
          name: user.name,
          role: user.role,
          needsApproval,
        }),
      });
    }

    return sendSuccess(
      res,
      { user: sanitizeUser(user) },
      "User registered successfully",
      201
    );
  } catch (error) {
    console.error("Signup Error:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return sendError(res, "Invalid credentials", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendError(res, "Invalid credentials", 400);
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("authToken", token, cookieOptions);

    return sendSuccess(
      res,
      {
        token,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        user: sanitizeUser(user),
      },
      "Login successful"
    );
  } catch (error) {
    console.error("Login Error:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.logout = (req, res) => {
  res.clearCookie("authToken", clearCookieOptions);
  return sendSuccess(res, null, "Logged out successfully");
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, { user: sanitizeUser(user) });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return sendError(res, "Email is required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return sendSuccess(
        res,
        null,
        "If an account with that email exists, a password reset link has been sent."
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "CareConnect Password Reset",
      text: `Reset your password using this link: ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your CareConnect password</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return sendSuccess(
      res,
      null,
      "If an account with that email exists, a password reset link has been sent."
    );
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(res, "Token and new password are required", 400);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return sendError(
        res,
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 symbol",
        400
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, "Reset token is invalid or expired", 400);
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return sendSuccess(res, null, "Password reset successfully");
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return sendError(res, "Server error", 500);
  }
};
