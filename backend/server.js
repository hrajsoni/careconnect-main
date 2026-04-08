require("dotenv").config();

// ============================================================
// Validate critical environment variables at startup
// ============================================================
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error("❌ FATAL ERROR: Missing required environment variables:");
  missingEnv.forEach((key) => console.error(`   - ${key}`));
  console.error("Set them in your .env file and restart the server.");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // ✅ Moved with other requires
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const { csrfMiddleware } = require('./middleware/csrf');

const app = express();

// ============================================================
// Ensure uploads directory exists
// ============================================================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Uploads directory created");
}

connectDB();

// ============================================================
// CORS — restricted to known frontend origin only
// ============================================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// ============================================================
// CRITICAL FIX: cookieParser MUST be mounted BEFORE routes
// Without this, req.cookies is always undefined
// Auth middleware reads authToken from req.cookies — broken
// without this line
// ============================================================
app.use(cookieParser()); // ✅ THIS WAS MISSING — ROOT CAUSE OF LOGIN BUG

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// CSRF Protection
// Validates X-CSRF-Token header on all POST/PUT/DELETE requests.
// Public auth endpoints (login, signup, forgot/reset-password)
// are exempted so users can log in without a token.
// ============================================================
const PUBLIC_POST_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
];

app.use((req, res, next) => {
  if (PUBLIC_POST_PATHS.includes(req.path)) return next();
  return csrfMiddleware(req, res, next);
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// Routes
// ============================================================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/bookings", require("./routes/booking"));
app.use("/api/nurses", require("./routes/nurse"));
app.use("/api/reports", require("./routes/report"));
app.use("/api/payments", require("./routes/payment"));
app.use("/api/care-assistant-requests", require("./routes/careAssistantRequest"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareConnect API running",
  });
});

console.log("✅ Routes loaded");

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Accepting requests from: ${allowedOrigins.join(", ")}`);
});