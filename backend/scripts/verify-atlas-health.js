/**
 * Quick Atlas connectivity + data sanity check (read-only).
 * Usage: node scripts/verify-atlas-health.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const CareAssistantRequest = require("../models/CareAssistantRequest");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Atlas: connected OK");

  const users = await User.countDocuments();
  const bookings = await Booking.countDocuments();
  const payments = await Payment.countDocuments();
  const caReqs = await CareAssistantRequest.countDocuments();

  const byRole = await User.aggregate([
    { $group: { _id: "$role", n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const pendingProviders = await User.countDocuments({
    role: { $in: ["nurse", "care_assistant"] },
    verificationStatus: "pending",
  });

  const nullRoleUsers = await User.countDocuments({
    $or: [{ role: null }, { role: { $exists: false } }],
  });

  console.log("Counts — users:", users, "| bookings:", bookings, "| payments:", payments, "| CA requests:", caReqs);
  console.log("Users by role:", JSON.stringify(byRole));
  console.log("Pending nurse/CA approvals:", pendingProviders);
  if (nullRoleUsers > 0) {
    console.warn("WARNING: users with missing/null role:", nullRoleUsers, "(review in Atlas or reassign role)");
  }

  await mongoose.disconnect();
  console.log("Atlas: disconnected");
}

main().catch((e) => {
  console.error("Atlas check failed:", e.message);
  process.exit(1);
});
