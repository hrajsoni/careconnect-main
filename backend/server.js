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
const connectDB = require("./config/db");
// const { csrfMiddleware } = require("./middleware/csrf");

const app = express();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

connectDB();

app.use(morgan("dev"));

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
      ].filter(Boolean);
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CSRF disabled — using cookie auth with SameSite protection
// app.use(csrfMiddleware);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/bookings", require("./routes/booking"));
app.use("/api/nurses", require("./routes/nurse"));
app.use("/api/reports", require("./routes/report"));
app.use("/api/payments", require("./routes/payment"));
app.use("/api/care-assistant-requests", require("./routes/careAssistantRequest"));

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
    message: "CareConnect API running",
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  const allowed = [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean);
  console.log(`Server running on port ${PORT}`);
  console.log(`Accepting requests from: ${allowed.join(", ")}`);
});
