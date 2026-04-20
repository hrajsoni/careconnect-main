require("dotenv").config();

const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error("FATAL ERROR: Missing required environment variables:");
  missingEnv.forEach((key) => console.error(` - ${key}`));
  console.error("Set them in your .env file and restart the server.");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const connectDB = require("./config/db");

const app = express();

// ============================================================
// SECURITY: Helmet sets secure HTTP response headers
// Prevents clickjacking, MIME sniffing, XSS attacks via headers
// contentSecurityPolicy disabled — this is an API-only server
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // required for /uploads static files
  })
);

// Remove 'X-Powered-By: Express' — prevents tech stack fingerprinting
app.disable("x-powered-by");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

connectDB();

// Only enable request logging in development — avoids logging PII in production
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
      ].filter(Boolean);
      
      // Remove trailing slashes from allowed array for safer matching
      const safeAllowed = allowed.map(url => url ? url.replace(/\/$/, '') : '');

      if (
        !origin || 
        safeAllowed.includes(origin) || 
        origin.endsWith(".vercel.app") 
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());

// ============================================================
// SECURITY: Limit request body size to mitigate DoS / OOM attacks
// JSON and URL-encoded requests capped at 2MB each
// ============================================================
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve uploaded files with cache-control headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/bookings", require("./routes/booking"));
app.use("/api/nurses", require("./routes/nurse"));
app.use("/api/reports", require("./routes/report"));
app.use("/api/payments", require("./routes/payment"));
app.use("/api/care-assistant-requests", require("./routes/careAssistantRequest"));
app.use("/api/ambulance", require("./routes/ambulance"));
app.use("/api/services", require("./routes/service"));
app.use("/api/doctors", require("./routes/doctor"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CareConnect API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareConnect API is running 🚀",
  });
});

// ============================================================
// SECURITY: Global error handler
// Never leaks stack traces or internal errors to clients
// in production. Full detail shown only in development.
// ============================================================
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";
  console.error("UNHANDLED ERROR:", err);
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : "An unexpected error occurred. Please try again.",
    ...(isDev && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  const allowed = [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean);
  console.log(`✅ CareConnect server running on port ${PORT}`);
  console.log(`🌐 CORS allowed from: ${allowed.join(", ")}`);
  console.log(`🛡️  Security headers: enabled (Helmet)`);
});
