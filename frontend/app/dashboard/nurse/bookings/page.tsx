"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  FileText,
  CheckCircle2,
  AlertCircle,
  ClipboardPlus,
  CreditCard,
  FolderOpen,
  RefreshCw,
  Phone,
  Ambulance,
  Building2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/Modal";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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

export default function NurseBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nurseId, setNurseId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [reportsMap, setReportsMap] = useState<Record<string, any[]>>({});

  const [visitSummary, setVisitSummary] = useState({
    bloodPressure: "",
    temperature: "",
    sugarLevel: "",
    oxygenLevel: "",
    pulseRate: "",
    treatmentProvided: "",
    notes: "",
    followUpRequired: false,
    followUpNotes: "",
    status: "completed",
  });

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const activeBookings = bookings.filter(
    (b) => b.status === "accepted" || b.status === "in_progress" || b.status === "completed"
  );

  const fetchPatientReports = async (patientId: string) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/reports/patient-reports/${patientId}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return [];
      }

      const data = await safeParseResponse(res);

      if (!res.ok) return [];

      return Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
    } catch (error) {
      return [];
    }
  };

  const fetchBookings = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const meRes = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (meRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const meData = await safeParseResponse(meRes);
      const fetchedNurseId =
        meData?.data?.user?._id ||
        meData?.user?._id ||
        meData?.data?.user?.id ||
        meData?.user?.id;
      if (!fetchedNurseId) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      setNurseId(fetchedNurseId);

      const res = await fetchWithTimeout(`${API_BASE}/api/bookings/nurse/${fetchedNurseId}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Unable to fetch bookings");
      }

      const safeBookings = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setBookings(safeBookings);

      const uniquePatientIds = Array.from(
        new Set(
          safeBookings
            .map((booking: any) => booking.patientId?._id)
            .filter(Boolean)
        )
      ) as string[];

      const reportsEntries = await Promise.all(
        uniquePatientIds.map(async (patientId: string) => {
          const reports = await fetchPatientReports(patientId);
          return [patientId, reports];
        })
      );

      const reportsObject = Object.fromEntries(reportsEntries);
      setReportsMap(reportsObject);
    } catch (error) {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const openSummaryModal = (booking: any) => {
    setSelectedBooking(booking);
    setVisitSummary({
      bloodPressure: booking.visitSummary?.bloodPressure || "",
      temperature: booking.visitSummary?.temperature || "",
      sugarLevel: booking.visitSummary?.sugarLevel || "",
      oxygenLevel: booking.visitSummary?.oxygenLevel || "",
      pulseRate: booking.visitSummary?.pulseRate || "",
      treatmentProvided: booking.visitSummary?.treatmentProvided || "",
      notes: booking.visitSummary?.notes || "",
      followUpRequired: booking.visitSummary?.followUpRequired || false,
      followUpNotes: booking.visitSummary?.followUpNotes || "",
      status: booking.status || "completed",
    });
  };

  const updateBookingStatus = async (bookingId: string, action: string) => {
    try {
      setStatusLoadingId(bookingId);

      const actionStatusMap: Record<string, string> = {
        confirm: "accepted",
        decline: "cancelled",
        start: "in_progress",
        complete: "completed",
      };

      const endpoint = `${API_BASE}/api/bookings/status/${bookingId}`;
      const method = "PUT";
      const body: Record<string, string> = {
        status: actionStatusMap[action] || "pending",
      };

      if (action === "decline") {
        body.cancellationReason = "Declined by nurse";
      }

      const res = await fetchWithTimeout(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || `Unable to ${action} booking`);
      }

      const actionMessages: Record<string, string> = {
        confirm: "Booking accepted!",
        decline: "Booking declined.",
        start: "Service started.",
        complete: "Service completed.",
      };

      setMessage({
        type: "success",
        text: actionMessages[action] || `Booking ${action}d.`,
      });

      await fetchBookings(false);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Unable to update booking.",
      });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const saveVisitSummary = async () => {
    if (!selectedBooking) return;

    setSaving(true);

    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/bookings/visit-summary/${selectedBooking._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(visitSummary),
        }
      );

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save visit summary");
      }

      setMessage({ type: "success", text: "Visit summary updated successfully." });
      setSelectedBooking(null);
      await fetchBookings(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to save summary." });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-green-50 text-green-700";
      case "cancelled":
        return "bg-red-50 text-red-700";
      case "in_progress":
        return "bg-orange-50 text-orange-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                My Bookings
              </h1>
              <p className="text-slate-500 mt-2">
                Review assigned appointments, update booking status, view patient reports, and record visit outcomes.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => fetchBookings(false)}
              disabled={refreshing || loading}
              className="rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
              <ClipboardPlus className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">No bookings yet</h3>
              <p className="text-slate-500 mt-2">
                Assigned patient appointments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {pendingBookings.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    📋 Pending Requests
                  </h2>
                  <p className="text-slate-500 mb-6">
                    New booking requests awaiting your confirmation
                  </p>
                  <div className="grid gap-6">
                    {pendingBookings.map((booking, index) => {
                      const patientName = booking.patientId?.name || "Patient record unavailable";

                      return (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2 mb-3">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadge(booking.status)}`}>
                                  {booking.status}
                                </div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                                  ₹{booking.paymentAmount || 0}
                                </div>
                              </div>

                              <h2 className="text-2xl font-bold text-slate-900">
                                {booking.service || "Service not specified"}
                              </h2>

                              <div className="mt-3 space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <UserRound className="w-4 h-4 text-teal-500" />
                                  Patient: {patientName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-teal-500" />
                                  {booking.patientId?.phone || "Phone not available"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-teal-500" />
                                  {booking.location || "No location"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-4 h-4 text-teal-500" />
                                  {booking.date || "Not set"} at {booking.time || "Not set"}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full md:w-auto">
                              <Button
                                type="button"
                                onClick={() => updateBookingStatus(booking._id, "confirm")}
                                disabled={statusLoadingId === booking._id}
                                className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                              >
                                {statusLoadingId === booking._id ? "Processing..." : "Confirm"}
                              </Button>

                              <Button
                                type="button"
                                onClick={() => updateBookingStatus(booking._id, "decline")}
                                disabled={statusLoadingId === booking._id}
                                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
                              >
                                {statusLoadingId === booking._id ? "Processing..." : "Decline"}
                              </Button>
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <h4 className="font-semibold text-slate-800 mb-2">
                                Patient Notes
                              </h4>
                              <p className="text-sm text-slate-600">{booking.notes}</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeBookings.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    ✅ My Bookings
                  </h2>
                  <p className="text-slate-500 mb-6">
                    Accepted and completed appointments
                  </p>
                  <div className="grid gap-6">
                    {activeBookings.map((booking, index) => {
                      const patientReports = reportsMap[booking.patientId?._id] || [];
                      const patientName = booking.patientId?.name || "Patient record unavailable";

                      return (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadge(booking.status)}`}
                                >
                                  {booking.status}
                                </div>

                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    booking.paymentStatus === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Payment: {booking.paymentStatus || "pending"}
                                </div>
                              </div>

                              <h2 className="text-2xl font-bold text-slate-900">
                                {booking.service || "Service not specified"}
                              </h2>

                              <div className="mt-3 space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <UserRound className="w-4 h-4 text-teal-500" />
                                  Patient: {patientName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-4 h-4 text-teal-500" />
                                  {booking.date || "Not set"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock3 className="w-4 h-4 text-teal-500" />
                                  {booking.time || "Not set"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-teal-500" />
                                  {booking.location || "No location"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-teal-500" />
                                  Amount: Rs. {booking.paymentAmount || 0}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {booking.status === "accepted" && booking.paymentStatus === "paid" && (
                                <Button
                                  type="button"
                                  onClick={() => updateBookingStatus(booking._id, "start")}
                                  disabled={statusLoadingId === booking._id}
                                  className="rounded-2xl bg-orange-600 text-white hover:bg-orange-700"
                                >
                                  {statusLoadingId === booking._id ? "Updating..." : "Start Service"}
                                </Button>
                              )}

                              {booking.status === "in_progress" && (
                                <Button
                                  type="button"
                                  onClick={() => updateBookingStatus(booking._id, "complete")}
                                  disabled={statusLoadingId === booking._id}
                                  className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  {statusLoadingId === booking._id ? "Updating..." : "Complete Service"}
                                </Button>
                              )}

                              <Button
                                type="button"
                                onClick={() => openSummaryModal(booking)}
                                className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                              >
                                Add / Edit Outcome
                              </Button>

                              {/* Ambulance options — for active/in-progress bookings */}
                              {(booking.status === "in_progress" || booking.status === "accepted") && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/book-ambulance?bookingId=${booking._id}&patientId=${booking.patientId?._id || ""}`
                                      )
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-sm hover:from-red-600 hover:to-rose-700 transition shadow-md shadow-red-200"
                                  >
                                    <Ambulance className="w-4 h-4" />
                                    Book Ambulance for Patient
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/hospital-system?bookingId=${booking._id}&patientId=${booking.patientId?._id || ""}`
                                      )
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-teal-200 text-teal-700 font-semibold text-sm hover:bg-teal-50 transition"
                                  >
                                    <Building2 className="w-4 h-4" />
                                    Hospital ICU Beds
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <h4 className="font-semibold text-slate-800 mb-2">
                                Patient Notes
                              </h4>
                              <p className="text-sm text-slate-600">{booking.notes}</p>
                            </div>
                          )}

                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <FolderOpen className="w-4 h-4 text-teal-600" />
                              <h4 className="font-semibold text-slate-800">
                                Patient Medical Reports
                              </h4>
                            </div>

                            {patientReports.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No medical reports uploaded by the patient.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {patientReports.map((report: any) => (
                                  <div
                                    key={report._id}
                                    className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-800">
                                        {report.originalName}
                                      </p>
                                      <p className="text-sm text-slate-500 mt-1">
                                        {report.notes || "No notes added"}
                                      </p>
                                    </div>

                                    <a
                                      href={`${API_BASE}/${report.fileUrl}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-teal-600 font-semibold hover:underline"
                                    >
                                      View Report
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {booking.visitSummary?.updatedAt && (
                            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
                              <h4 className="font-semibold text-teal-800 mb-2">
                                Recorded Visit Outcome
                              </h4>
                              <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
                                <p><strong>BP:</strong> {booking.visitSummary.bloodPressure || "—"}</p>
                                <p><strong>Temp:</strong> {booking.visitSummary.temperature || "—"}</p>
                                <p><strong>Sugar:</strong> {booking.visitSummary.sugarLevel || "—"}</p>
                                <p><strong>Oxygen:</strong> {booking.visitSummary.oxygenLevel || "—"}</p>
                                <p><strong>Pulse:</strong> {booking.visitSummary.pulseRate || "—"}</p>
                              </div>
                              {booking.visitSummary.treatmentProvided && (
                                <p className="mt-3 text-sm text-slate-700">
                                  <strong>Treatment:</strong> {booking.visitSummary.treatmentProvided}
                                </p>
                              )}
                              {booking.visitSummary.notes && (
                                <p className="mt-2 text-sm text-slate-700">
                                  <strong>Notes:</strong> {booking.visitSummary.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)}>
            <div className="pt-4">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Appointment Outcome
              </h2>
              <p className="text-slate-500 mb-6">
                Record vitals, treatment provided, and follow-up notes for this visit.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  placeholder="Blood Pressure"
                  value={visitSummary.bloodPressure}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, bloodPressure: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  placeholder="Temperature"
                  value={visitSummary.temperature}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, temperature: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  placeholder="Sugar Level"
                  value={visitSummary.sugarLevel}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, sugarLevel: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  placeholder="Oxygen Level"
                  value={visitSummary.oxygenLevel}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, oxygenLevel: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  placeholder="Pulse Rate"
                  value={visitSummary.pulseRate}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, pulseRate: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
                <select
                  value={visitSummary.status}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <textarea
                rows={4}
                placeholder="Treatment provided"
                value={visitSummary.treatmentProvided}
                onChange={(e) =>
                  setVisitSummary((prev) => ({ ...prev, treatmentProvided: e.target.value }))
                }
                className="w-full mt-4 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />

              <textarea
                rows={4}
                placeholder="Clinical notes / observations"
                value={visitSummary.notes}
                onChange={(e) =>
                  setVisitSummary((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full mt-4 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />

              <div className="mt-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={visitSummary.followUpRequired}
                  onChange={(e) =>
                    setVisitSummary((prev) => ({
                      ...prev,
                      followUpRequired: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-teal-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  Follow-up required
                </span>
              </div>

              <textarea
                rows={3}
                placeholder="Follow-up notes"
                value={visitSummary.followUpNotes}
                onChange={(e) =>
                  setVisitSummary((prev) => ({ ...prev, followUpNotes: e.target.value }))
                }
                className="w-full mt-4 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedBooking(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                  onClick={saveVisitSummary}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Outcome"}
                </Button>
              </div>
            </div>
          </Modal>

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
