"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud,
  Stethoscope,
  User,
  FileBadge,
  Plus,
  ChevronDown,
  ShieldCheck,
  Pencil,
  Sparkles,
  CalendarDays,
  TimerReset,
  ToggleLeft,
  RefreshCw,
  BookOpen,
  TrendingUp,
  Settings,
  ArrowRight,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const SERVICE_BUNDLES = [
  {
    title: "Basic Medical Services",
    icon: <Stethoscope className="w-5 h-5" />,
    services: [
      "Injection (IV / IM)",
      "Blood Pressure Monitoring",
      "Blood Sugar Check",
      "Temperature Check",
      "Oxygen Level Monitoring",
      "Wound Dressing",
      "Bandage Change",
      "First Aid Care",
      "IV Fluid Administration",
      "Catheter Care",
      "Enema Administration",
    ],
  },
  {
    title: "Elderly Care",
    icon: <User className="w-5 h-5" />,
    services: [
      "Bedridden Patient Care",
      "Daily Hygiene",
      "Feeding Assistance",
      "Mobility Support",
      "Fall Prevention",
      "Dementia Support",
    ],
  },
  {
    title: "Home Nursing Care",
    icon: <ShieldCheck className="w-5 h-5" />,
    services: [
      "12-hour Nursing",
      "24-hour Nursing",
      "ICU Setup at Home",
      "Post Hospital Care",
      "Critical Monitoring",
    ],
  },
];

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

async function safeParseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!rawText) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("Server returned invalid JSON response.");
    }
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      success: false,
      message: "Unexpected server response received.",
      raw: rawText,
    };
  }
}

// ============================================================
// FIXED: Centralized 401 handler
// Previously: localStorage.clear() + window.location.href
// Now: selective removal + router.push (passed in as param)
// ============================================================
const handleUnauthorized = (router: ReturnType<typeof useRouter>) => {
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("name");
  localStorage.removeItem("verificationStatus");
  localStorage.removeItem("rejectionReason");
  router.push("/login");
};

export default function NurseDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [nurseName, setNurseName] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    completed: 0,
    totalEarnings: 0,
  });

  const [formData, setFormData] = useState({
    qualification: "",
    experience: "",
    registrationNumber: "",
  });

  const [files, setFiles] = useState<Record<string, File>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [hasSavedServices, setHasSavedServices] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);

  const [availability, setAvailability] = useState({
    availableDays: [] as string[],
    startTime: "",
    endTime: "",
    slotDuration: "30",
    isAvailableForBooking: true,
  });

  const loadNurseData = async (showRefresh = false) => {
    // verificationStatus and name are loaded fresh from /me below — no localStorage pre-read needed

    try {
      if (showRefresh) setRefreshing(true);

      // ============================================================
      // FIXED: Removed Authorization header with localStorage token
      // Now uses credentials:"include" — HTTPOnly cookie sent
      // automatically by the browser
      // ============================================================
      const meRes = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });

      if (meRes.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const data = await safeParseResponse(meRes);

      if (!meRes.ok) {
        throw new Error(data?.message || "Failed to fetch nurse profile");
      }

      const user = data?.data?.user || data?.user || data;
      const currentUserId = user?._id || user?.id;
      setUserId(currentUserId);

      if (!currentUserId) return;

      setFormData({
        qualification: user?.qualification || "",
        experience: user?.experience !== undefined ? String(user.experience) : "",
        registrationNumber: user?.registrationNumber || "",
      });

      if (user?.name) {
        setNurseName(user.name);
        // name stays in React state only — not persisted to localStorage
      }

      if (user?.verificationStatus) {
        setVerificationStatus(user.verificationStatus);
        setRejectionReason(user.rejectionReason || null);
        // verificationStatus stays in React state only — fetch fresh from /me each time
      }

      const savedServices = Array.isArray(user?.services) ? user.services : [];
      setSelectedServices(savedServices);
      setHasSavedServices(savedServices.length > 0);

      const savedAvailability = user?.availability || {};
      setAvailability({
        availableDays: Array.isArray(savedAvailability.availableDays)
          ? savedAvailability.availableDays
          : [],
        startTime: savedAvailability.startTime || "",
        endTime: savedAvailability.endTime || "",
        slotDuration: String(savedAvailability.slotDuration || 30),
        isAvailableForBooking:
          typeof savedAvailability.isAvailableForBooking === "boolean"
            ? savedAvailability.isAvailableForBooking
            : true,
      });

      // ============================================================
      // FIXED: Bookings fetch uses cookie instead of Bearer token
      // ============================================================
      const bookingsRes = await fetchWithTimeout(
        `${API_BASE}/api/bookings/nurse/${currentUserId}`,
        {
          credentials: "include",
        }
      );

      if (bookingsRes.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const bookingsData = await safeParseResponse(bookingsRes);

      if (bookingsRes.ok) {
        const bookingsList = Array.isArray(bookingsData?.data)
          ? bookingsData.data
          : Array.isArray(bookingsData)
          ? bookingsData
          : [];

        const pendingCount = bookingsList.filter(
          (b: { status: string }) => b.status === "pending"
        ).length;
        const acceptedCount = bookingsList.filter(
          (b: { status: string }) => b.status === "accepted"
        ).length;
        const completedCount = bookingsList.filter(
          (b: { status: string }) => b.status === "completed"
        ).length;
        const totalEarnings = bookingsList
          .filter((b: { paymentStatus: string }) => b.paymentStatus === "paid")
          .reduce(
            (sum: number, b: { paymentAmount?: number }) =>
              sum + Math.round(Number(b.paymentAmount || 0) * 0.70),
            0
          );

        setStats({
          pending: pendingCount,
          accepted: acceptedCount,
          completed: completedCount,
          totalEarnings,
        });
      }
    } catch {
      // Silent fail — stale data remains visible
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNurseData();
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [e.target.name]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      // ============================================================
      // FIXED: Removed localStorage.getItem("token") check
      // Cookie is sent automatically via credentials:"include"
      // If not logged in, server returns 401 which we handle below
      // ============================================================
      const profileRes = await fetchWithTimeout(`${API_BASE}/api/auth/complete-profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          ...formData,
        }),
      });

      if (profileRes.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const profileData = await safeParseResponse(profileRes);

      if (!profileRes.ok) {
        throw new Error(profileData?.message || "Failed to submit profile.");
      }

      const uploadData = new FormData();
      uploadData.append("id", userId);
      if (files.photo) uploadData.append("photo", files.photo);
      if (files.idProof) uploadData.append("idProof", files.idProof);
      if (files.licenseProof) uploadData.append("licenseProof", files.licenseProof);

      // ============================================================
      // FIXED: File upload also uses cookie auth
      // Do NOT set Content-Type manually for FormData —
      // browser sets it automatically with correct boundary
      // ============================================================
      const uploadRes = await fetchWithTimeout(`${API_BASE}/api/auth/upload-documents`, {
        method: "POST",
        credentials: "include",
        body: uploadData,
      });

      if (uploadRes.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const uploadResult = await safeParseResponse(uploadRes);

      if (!uploadRes.ok) {
        throw new Error(uploadResult?.message || "Failed to upload documents.");
      }

      // Update React state directly — no longer written to localStorage
      setVerificationStatus("pending");

      setMessage({
        type: "success",
        text: "Application submitted! Review takes ~24h.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessage({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const saveServices = async () => {
    setSavingServices(true);

    try {
      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      const finalServices = [...selectedServices];

      if (finalServices.length === 0) {
        setMessage({
          type: "error",
          text: "Please select at least one service.",
        });
        return;
      }

      // FIXED: Cookie auth
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/save-services`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          services: finalServices,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save services.");
      }

      setSelectedServices(finalServices);
      setHasSavedServices(true);
      setIsEditingServices(false);

      setMessage({
        type: "success",
        text: "Services saved successfully.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save services.";
      setMessage({ type: "error", text: message });
    } finally {
      setSavingServices(false);
    }
  };

  const toggleAvailabilityDay = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const saveAvailability = async () => {
    setSavingAvailability(true);

    try {
      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      if (availability.availableDays.length === 0) {
        setMessage({
          type: "error",
          text: "Please select at least one available day.",
        });
        return;
      }

      if (!availability.startTime || !availability.endTime) {
        setMessage({
          type: "error",
          text: "Please select start and end time.",
        });
        return;
      }

      // FIXED: Cookie auth
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/save-availability`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          availableDays: availability.availableDays,
          startTime: availability.startTime,
          endTime: availability.endTime,
          slotDuration: Number(availability.slotDuration),
          isAvailableForBooking: availability.isAvailableForBooking,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save availability.");
      }

      setMessage({
        type: "success",
        text: "Availability saved successfully.",
      });

      await loadNurseData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save availability.";
      setMessage({ type: "error", text: message });
    } finally {
      setSavingAvailability(false);
    }
  };

  const steps = [
    { label: "Application", icon: <FileBadge className="w-5 h-5" /> },
    { label: "Under Review", icon: <Clock className="w-5 h-5" /> },
    { label: "Verified", icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const currentStep =
    verificationStatus === "approved"
      ? 2
      : verificationStatus === "pending"
      ? 1
      : 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] bg-gradient-to-r from-teal-600 to-teal-700 text-white p-8 md:p-10 shadow-xl mb-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  Welcome, {nurseName || "Nurse"}
                </h1>
                <p className="text-teal-100 mt-2">
                  Manage your bookings, verify your credentials, and grow your
                  practice.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => loadNurseData(true)}
                disabled={refreshing}
                className="rounded-2xl bg-white text-teal-600 hover:bg-teal-50"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </Button>
            </div>
          </motion.div>

          {verificationStatus === "approved" && (
            <div className="grid md:grid-cols-4 gap-4 mb-10">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Pending</p>
                </div>
                <p className="text-4xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-400 mt-2">Awaiting your response</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Accepted</p>
                </div>
                  <p className="text-4xl font-bold text-slate-900">{stats.accepted}</p>
                <p className="text-xs text-slate-400 mt-2">Active bookings</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Completed</p>
                </div>
                <p className="text-4xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs text-slate-400 mt-2">Past appointments</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Earnings</p>
                </div>
                <p className="text-4xl font-bold text-slate-900">
                  ₹{stats.totalEarnings}
                </p>
                <p className="text-xs text-slate-400 mt-2">From accepted bookings</p>
              </motion.div>
            </div>
          )}

          {verificationStatus === "approved" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => router.push("/dashboard/nurse/bookings")}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition"
              >
                <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl w-fit mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">View Bookings</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Manage your appointments
                </p>
                <ArrowRight className="w-5 h-5 text-teal-600 mt-4" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => router.push("/dashboard/nurse/profile")}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition"
              >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl w-fit mb-4">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">My Profile</h3>
                <p className="text-sm text-slate-500 mt-2">View public profile</p>
                <ArrowRight className="w-5 h-5 text-teal-600 mt-4" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => {
                  setIsEditingServices(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition"
              >
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl w-fit mb-4">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Services</h3>
                <p className="text-sm text-slate-500 mt-2">Manage your services</p>
                <ArrowRight className="w-5 h-5 text-teal-600 mt-4" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                onClick={() => {
                  setIsEditingServices(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition"
              >
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl w-fit mb-4">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Pricing</h3>
                <p className="text-sm text-slate-500 mt-2">Set your availability</p>
                <ArrowRight className="w-5 h-5 text-teal-600 mt-4" />
              </motion.div>
            </div>
          )}

          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Professional Portal
              </h2>
              <p className="text-slate-500 mt-2">
                Manage verification, service offerings, and booking availability.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
            <div className="relative flex justify-between items-start max-w-2xl">
              <div className="absolute top-6 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />

              <motion.div
                className="absolute top-6 left-0 h-1 bg-teal-500 -translate-y-1/2 z-0 rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width: `${(currentStep / (steps.length - 1)) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />

              {steps.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;
                const isPending = idx > currentStep;

                return (
                  <div
                    key={idx}
                    className="relative z-10 flex flex-col items-center group"
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isPending ? "#ffffff" : "#14b8a6",
                        borderColor: isPending ? "#e2e8f0" : "#14b8a6",
                      }}
                      className="w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500 shadow-sm"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <div
                          className={`${
                            isActive ? "text-white" : "text-slate-400"
                          }`}
                        >
                          {step.icon}
                        </div>
                      )}
                    </motion.div>

                    <div className="absolute -bottom-8 w-32 text-center">
                      <span
                        className={`text-[10px] uppercase tracking-[0.15em] font-bold ${
                          isActive || isCompleted
                            ? "text-teal-600"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-6" />
          </div>

          <AnimatePresence mode="wait">
            {verificationStatus === "pending" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 text-amber-800 mb-8"
              >
                <div className="bg-amber-100 p-2 rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">
                  Your credentials are currently being verified by our medical
                  board. Access to listings and live availability will be granted
                  shortly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            {(verificationStatus === null ||
              verificationStatus === "rejected") && (
              <div className="p-8 lg:p-12">
                {verificationStatus === "rejected" && rejectionReason && (
                  <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-full mt-1 shrink-0">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-rose-800 font-bold mb-1">Application Rejected</h3>
                      <p className="text-sm text-rose-600 leading-relaxed">{rejectionReason}</p>
                      <p className="text-sm font-semibold text-rose-700 mt-2">Please correct your details and re-submit your documents.</p>
                    </div>
                  </div>
                )}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Complete Professional Profile
                  </h2>
                  <p className="text-slate-500">
                    We require these details to maintain high safety standards.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">
                        Academic Qualification
                      </label>
                      <input
                        name="qualification"
                        placeholder="e.g. BSc in Nursing"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        required
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            qualification: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">
                        Years of Experience
                      </label>
                      <input
                        name="experience"
                        type="number"
                        placeholder="e.g. 5"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        required
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            experience: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      License Registration Number
                    </label>
                    <input
                      name="registrationNumber"
                      placeholder="Govt Issued ID"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      required
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { field: "photo", label: "Profile Photo" },
                      { field: "idProof", label: "National ID (e.g., Aadhaar) / Passport" },
                      { field: "licenseProof", label: "Upload License" },
                    ].map(({ field, label }) => (
                      <label
                        key={field}
                        className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-teal-400 cursor-pointer transition-all group"
                      >
                        <UploadCloud
                          className={`w-8 h-8 mb-2 ${
                            files[field]
                              ? "text-teal-500"
                              : "text-slate-400 group-hover:text-teal-500"
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-500 text-center uppercase tracking-tighter">
                          {files[field]
                            ? files[field].name.substring(0, 15) + "..."
                            : label}
                        </span>
                        {field === "idProof" && !files[field] && (
                          <span className="text-[10px] text-slate-400 mt-0.5 text-center">
                            (Front &amp; Back)
                          </span>
                        )}
                        <input
                          type="file"
                          name={field}
                          onChange={handleFileChange}
                          className="hidden"
                          required
                        />
                        {files[field] && (
                          <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-teal-500" />
                        )}
                      </label>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg shadow-lg shadow-teal-200 transition-all"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Submit for Verification"}
                  </Button>
                </form>
              </div>
            )}

            {verificationStatus === "approved" && (
              <div className="p-8 lg:p-12 space-y-10">
                {/* Services */}
                <div>
                  <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                          Service Portfolio
                        </h2>
                        <p className="text-slate-500">
                          Manage the care services visible on your professional
                          profile.
                        </p>
                      </div>
                    </div>

                    {hasSavedServices && !isEditingServices && (
                      <Button
                        type="button"
                        onClick={() => setIsEditingServices(true)}
                        className="rounded-2xl bg-slate-900 text-white px-5 py-3 hover:bg-slate-800"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Pencil className="w-4 h-4" />
                          Modify Services
                        </span>
                      </Button>
                    )}
                  </div>

                  {hasSavedServices && !isEditingServices ? (
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-white shadow-sm text-teal-600">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">
                            Your Selected Services
                          </h3>
                          <p className="text-sm text-slate-500">
                            These are the services currently listed on your
                            profile.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {selectedServices.map((service, index) => (
                          <motion.div
                            key={service}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            className="px-4 py-2 rounded-full bg-white border border-teal-200 text-slate-700 font-medium shadow-sm"
                          >
                            {service}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {SERVICE_BUNDLES.map((bundle, index) => (
                        <div
                          key={index}
                          className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(expanded === index ? null : index)
                            }
                            className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 font-bold text-slate-700">
                              {bundle.icon}
                              {bundle.title}
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-400 transition-transform ${
                                expanded === index ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {expanded === index && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-slate-50/50"
                              >
                                <div className="p-6 grid md:grid-cols-2 gap-3">
                                  {bundle.services.map((service) => (
                                    <label
                                      key={service}
                                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-500 transition-all"
                                    >
                                      <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-teal-600 rounded"
                                        checked={selectedServices.includes(
                                          service
                                        )}
                                        onChange={() =>
                                          setSelectedServices((prev) =>
                                            prev.includes(service)
                                              ? prev.filter((s) => s !== service)
                                              : [...prev, service]
                                          )
                                        }
                                      />
                                      <span className="text-sm font-medium text-slate-600">
                                        {service}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}

                      <div className="mt-8 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            type="button"
                            onClick={saveServices}
                            disabled={savingServices}
                            className="flex-1 py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold disabled:opacity-60"
                          >
                            {savingServices ? "Saving..." : "Save Services"}
                          </Button>

                          {hasSavedServices && (
                            <Button
                              type="button"
                              onClick={() => {
                                setIsEditingServices(false);
                              }}
                              className="flex-1 py-4 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white text-teal-700 rounded-2xl shadow-sm">
                      <CalendarDays className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        Availability Schedule
                      </h2>
                      <p className="text-slate-500">
                        Set the days and hours when patients can request
                        bookings.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Available Days
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {WEEK_DAYS.map((day) => {
                          const active =
                            availability.availableDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleAvailabilityDay(day)}
                              className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${
                                active
                                  ? "bg-teal-600 text-white border-teal-600"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-teal-300"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={availability.startTime}
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              startTime: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={availability.endTime}
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              endTime: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Slot Duration
                        </label>
                        <div className="relative">
                          <TimerReset className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <select
                            value={availability.slotDuration}
                            onChange={(e) =>
                              setAvailability((prev) => ({
                                ...prev,
                                slotDuration: e.target.value,
                              }))
                            }
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                          >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          Accept New Bookings
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Turn this off if you want to temporarily pause booking
                          requests.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAvailability((prev) => ({
                            ...prev,
                            isAvailableForBooking: !prev.isAvailableForBooking,
                          }))
                        }
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition ${
                          availability.isAvailableForBooking
                            ? "bg-teal-100 text-teal-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <ToggleLeft className="w-5 h-5" />
                        {availability.isAvailableForBooking
                          ? "Active"
                          : "Paused"}
                      </button>
                    </div>

                    <Button
                      type="button"
                      onClick={saveAvailability}
                      disabled={savingAvailability}
                      className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                    >
                      {savingAvailability
                        ? "Saving Availability..."
                        : "Save Availability"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white font-bold flex items-center gap-2 z-50 ${
                  message.type === "success" ? "bg-teal-600" : "bg-red-500"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
