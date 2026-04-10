"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  MapPin,
  HeartHandshake,
  ClipboardList,
  Activity,
  FileText,
  RefreshCw,
  UserRound,
  Stethoscope,
  FolderOpen,
  CreditCard,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
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

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsMap, setReportsMap] = useState<Record<string, any[]>>({});
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

      setError("");
      
      

      const res = await fetchWithTimeout(`${API_BASE}/api/admin/bookings`, {
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch bookings");
      }

      const safeBookings = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setBookings(safeBookings);

      const uniquePatientIds: string[] = Array.from(
        new Set(
          safeBookings
            .map((booking: any) => booking.patientId?._id)
            .filter((id: any): id is string => Boolean(id))
        )
      );

      const reportsEntries = await Promise.all(
        uniquePatientIds.map(async (patientId: string) => {
          const reports = await fetchPatientReports(patientId);
          return [patientId, reports];
        })
      );

      const reportsObject = Object.fromEntries(reportsEntries);
      setReportsMap(reportsObject);
    } catch (error) {
      setError((error as any).message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-red-50 text-red-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const filteredBookings = useMemo(() => {
    return statusFilter === "all"
      ? bookings
      : bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  All Bookings
                </h1>
                <p className="text-slate-500 mt-2">
                  Monitor appointments, patient reports, payment status, assigned nurses, and visit outcomes.
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

            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "in_progress", "completed", "cancelled"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    statusFilter === status
                      ? "bg-teal-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "in_progress"
                    ? "In Progress"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading bookings...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl">
                {error}
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">
                  No bookings found
                </h3>
                <p className="text-slate-500 mt-2">
                  All patient appointments will appear here once bookings are created.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredBookings.map((booking, index) => {
                  const patientReports = reportsMap[booking.patientId?._id] || [];
                  const patientName = booking.patientId?.name || "Patient record unavailable";
                  const nurseName = booking.nurseId?.name || "Nurse record unavailable";

                    return (
                    <motion.div
                      key={booking._id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadge(
                                booking.status
                              )}`}
                            >
                              <HeartHandshake className="w-4 h-4" />
                              {booking.status || "pending"}
                            </div>

                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                booking.paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              <CreditCard className="w-4 h-4" />
                              Payment: {booking.paymentStatus || "pending"}
                            </div>
                          </div>

                          <h2 className="text-2xl font-bold text-slate-900">
                            {booking.service || "Service not specified"}
                          </h2>

                          <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <UserRound className="w-4 h-4 text-teal-500" />
                              Patient: {patientName}
                            </div>

                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-teal-500" />
                              Nurse: {nurseName}
                            </div>

                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              {booking.date || "Not set"}
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock3 className="w-4 h-4 text-teal-500" />
                              {booking.time || "Not set"}
                            </div>

                            <div className="flex items-center gap-2 md:col-span-2">
                              <MapPin className="w-4 h-4 text-teal-500" />
                              {booking.location || "No location"}
                            </div>

                            <div className="flex items-center gap-2 md:col-span-2">
                              <CreditCard className="w-4 h-4 text-teal-500" />
                              Amount: Rs. {booking.paymentAmount || 0}
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                              <p className="font-semibold text-slate-800 mb-2">
                                Patient Booking Notes
                              </p>
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
                            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-teal-600" />
                                <h3 className="text-lg font-bold text-teal-900">
                                  Visit Outcome Recorded by Nurse
                                </h3>
                              </div>

                              <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700">
                                <p>
                                  <strong>Blood Pressure:</strong>{" "}
                                  {booking.visitSummary.bloodPressure || "—"}
                                </p>
                                <p>
                                  <strong>Temperature:</strong>{" "}
                                  {booking.visitSummary.temperature || "—"}
                                </p>
                                <p>
                                  <strong>Sugar Level:</strong>{" "}
                                  {booking.visitSummary.sugarLevel || "—"}
                                </p>
                                <p>
                                  <strong>Oxygen Level:</strong>{" "}
                                  {booking.visitSummary.oxygenLevel || "—"}
                                </p>
                                <p>
                                  <strong>Pulse Rate:</strong>{" "}
                                  {booking.visitSummary.pulseRate || "—"}
                                </p>
                                <p>
                                  <strong>Follow-up Required:</strong>{" "}
                                  {booking.visitSummary.followUpRequired ? "Yes" : "No"}
                                </p>
                              </div>

                              {booking.visitSummary.treatmentProvided && (
                                <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-teal-600" />
                                    <p className="font-semibold text-slate-800">
                                      Treatment Provided
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-600">
                                    {booking.visitSummary.treatmentProvided}
                                  </p>
                                </div>
                              )}

                              {booking.visitSummary.notes && (
                                <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ClipboardList className="w-4 h-4 text-teal-600" />
                                    <p className="font-semibold text-slate-800">
                                      Nurse Observations
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-600">
                                    {booking.visitSummary.notes}
                                  </p>
                                </div>
                              )}

                              {booking.visitSummary.followUpNotes && (
                                <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <RefreshCw className="w-4 h-4 text-teal-600" />
                                    <p className="font-semibold text-slate-800">
                                      Follow-up Notes
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-600">
                                    {booking.visitSummary.followUpNotes}
                                  </p>
                                </div>
                              )}

                              <p className="mt-4 text-xs text-slate-500">
                                Last updated:{" "}
                                {new Date(booking.visitSummary.updatedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}