"use client";

import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ambulance,
  MapPin,
  Phone,
  UserRound,
  Clock,
  Building2,
  Bed,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
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
    try { return JSON.parse(rawText); } catch { throw new Error("Invalid JSON"); }
  }
  try { return JSON.parse(rawText); } catch { return { success: false, message: "Unexpected response" }; }
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-yellow-50 text-yellow-700 border-yellow-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
  arrived: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const CONDITION_COLORS: Record<string, string> = {
  critical: "bg-red-50 text-red-700",
  serious: "bg-amber-50 text-amber-700",
  stable: "bg-emerald-50 text-emerald-700",
};

export default function AdminAmbulancePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const fetchRequests = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); else setRefreshing(true);
      const res = await fetchWithTimeout(`${API_BASE}/api/ambulance/all`, {
        credentials: "include",
      });
      if (res.status === 401) { clearStoredAuth(); router.push("/login"); return; }
      const data = await safeParseResponse(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch");
      setRequests(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load ambulance requests." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(true); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/ambulance/status/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) { clearStoredAuth(); router.push("/login"); return; }
      const data = await safeParseResponse(res);
      if (!res.ok) throw new Error(data?.message || "Update failed");
      setMessage({ type: "success", text: `Status updated to ${status}.` });
      await fetchRequests(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Update failed." });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-100 text-sm font-bold mb-3">
                  <Ambulance className="w-4 h-4" />
                  Emergency System — Demo
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Ambulance Requests
                </h1>
                <p className="text-slate-500 mt-1">
                  Monitor all ambulance dispatches, hospital bed bookings, and critical patient transfers.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => fetchRequests(false)}
                disabled={refreshing || loading}
                className="rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </Button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total", count: requests.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
                { label: "Dispatched", count: requests.filter((r) => r.status === "dispatched").length, color: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "Completed", count: requests.filter((r) => r.status === "completed").length, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: "Beds Booked", count: requests.filter((r) => r.bedBooked).length, color: "bg-violet-50 border-violet-200 text-violet-700" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">{s.label}</p>
                  <p className="text-3xl font-extrabold mt-1">{s.count}</p>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2">
              {["all", "requested", "dispatched", "arrived", "completed", "cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    statusFilter === s
                      ? "bg-teal-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading ambulance requests...
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                <Ambulance className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">No requests found</h3>
                <p className="text-slate-500 mt-2">
                  Ambulance dispatch requests will appear here when patients book during critical situations.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filtered.map((req, index) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Left info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${STATUS_COLORS[req.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                            <Ambulance className="w-3 h-3" /> {req.status}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${CONDITION_COLORS[req.condition] || "bg-slate-50 text-slate-700"}`}>
                            <Activity className="w-3 h-3" /> {req.condition || "—"}
                          </span>
                          {req.bedBooked && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-violet-50 text-violet-700">
                              <Bed className="w-3 h-3" /> Bed {req.bedNumber} ({req.bedType})
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-50 text-slate-600">
                            Requested by: {req.requestedBy || "patient"}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">
                          Ambulance Dispatch #{req._id.slice(-6).toUpperCase()}
                        </h2>

                        <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <UserRound className="w-4 h-4 text-teal-500" />
                            Patient: {req.patientId?.name || "Unknown"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-teal-500" />
                            {req.patientId?.phone ? `+91 ${req.patientId.phone}` : "Not available"}
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2">
                            <MapPin className="w-4 h-4 text-red-400" />
                            Pickup: {req.pickupAddress}
                          </div>
                          {req.selectedHospital && (
                            <div className="flex items-center gap-2 md:col-span-2">
                              <Building2 className="w-4 h-4 text-teal-500" />
                              Hospital: {req.selectedHospital}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Ambulance className="w-4 h-4 text-slate-400" />
                            Vehicle: {req.ambulanceNumber || "—"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-slate-400" />
                            Driver: {req.driverName || "—"} · {req.driverPhone || "—"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            ETA: {req.estimatedArrival} min
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            Created: {new Date(req.createdAt).toLocaleString()}
                          </div>
                        </div>

                        {req.notes && (
                          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                            <p className="font-semibold text-slate-800 mb-1">Notes</p>
                            {req.notes}
                          </div>
                        )}
                      </div>

                      {/* Status update */}
                      {req.status !== "completed" && req.status !== "cancelled" && (
                        <div className="flex flex-col gap-3 lg:w-48 shrink-0">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Status</p>
                          {["dispatched", "arrived", "completed", "cancelled"]
                            .filter((s) => s !== req.status)
                            .map((s) => (
                              <Button
                                key={s}
                                type="button"
                                onClick={() => updateStatus(req._id, s)}
                                disabled={updatingId === req._id}
                                className={`w-full rounded-2xl text-sm font-semibold ${
                                  s === "cancelled"
                                    ? "border border-red-200 text-red-600 hover:bg-red-50 bg-white"
                                    : s === "completed"
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                                }`}
                                variant={s === "cancelled" ? "outline" : undefined}
                              >
                                {updatingId === req._id ? "..." : `Mark ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white font-bold flex items-center gap-2 z-50 ${message.type === "success" ? "bg-teal-600" : "bg-red-500"}`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </AdminGuard>
  );
}
