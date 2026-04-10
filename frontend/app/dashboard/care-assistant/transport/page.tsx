"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Car,
  MapPin,
  Clock3,
  Route,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  UserRound,
  Phone,
  ArrowRight,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
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

  throw new Error("Unexpected server response received.");
}

export default function CareAssistantTransportPage() {
  const router = useRouter();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const assistantId =
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  const fetchRequests = async () => {
    if (!assistantId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetchWithTimeout(
        `${API_BASE}/api/care-assistant-requests/assistant/${assistantId}`,
        {
          credentials: "include",
        }
      );

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load requests");
      }

      const allRequests = Array.isArray(data?.data) ? data.data : [];
      setAllRequests(allRequests);
      // Filter for accepted or in_progress only
      const activeRequests = allRequests.filter(
        (r: any) => r.status === "accepted" || r.status === "in_progress"
      );
      setRequests(activeRequests);
    } catch (error: any) {
      setAllRequests([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [assistantId]);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleStatusUpdate = async (
    requestId: string,
    status: "in_progress" | "completed"
  ) => {
    try {
      setProcessingId(requestId);
      const res = await fetchWithTimeout(
        `${API_BASE}/api/care-assistant-requests/status/${requestId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update request");
      }

      setMessage({ type: "success", text: "Status updated successfully." });
      await fetchRequests();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to update status.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const activeCount = requests.filter(
    (r) => r.status === "accepted" || r.status === "in_progress"
  ).length;
  const upcomingCount = requests.filter((r) => r.status === "accepted").length;
  const completedCount = allRequests.filter((r) => r.status === "completed").length;

  const stats = [
    {
      title: "Active Transport Tasks",
      value: String(activeCount),
      icon: <Car className="w-5 h-5" />,
      color: "bg-teal-50 text-teal-700 border-teal-100",
    },
    {
      title: "Completed Trips",
      value: String(completedCount),
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Upcoming Pickups",
      value: String(upcomingCount),
      icon: <Clock3 className="w-5 h-5" />,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                <Car className="w-4 h-4" />
                Transport Assistance
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Pickup & Drop Support
              </h1>
              <p className="text-slate-500 mt-2 max-w-2xl">
                Manage patient pickup, drop, escort support, and appointment travel
                coordination.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className={`rounded-3xl border p-5 shadow-sm ${stat.color}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{stat.title}</p>
                    {stat.icon}
                  </div>
                  <p className="text-3xl font-black mt-3">{stat.value}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center text-slate-400">
                Loading active jobs...
              </div>
            ) : requests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-5">
                  <Route className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  No active transport jobs
                </h2>
                <p className="text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed">
                  You don't have any active pickup or drop tasks at the moment.
                  New requests will appear here when patients need transport
                  assistance.
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-5">
                {requests.map((request, index) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              request.status === "in_progress"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {request.status}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                            {request.requestType?.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <UserRound className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-slate-500">Patient</p>
                              <p className="font-semibold text-slate-900">
                                {request.patient?.name || "Unknown"}
                              </p>
                            </div>
                          </div>

                          {request.patient?.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-teal-600 flex-shrink-0" />
                              <a
                                href={`tel:${request.patient.phone}`}
                                className="text-teal-600 hover:underline font-medium"
                              >
                                {request.patient.phone}
                              </a>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-4">
                            <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-900">
                              {request.pickupLocation}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="font-semibold text-slate-900">
                              {request.destination}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-600 mt-3">
                            <Clock3 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            <span>
                              {request.scheduledDate} at {request.scheduledTime}
                            </span>
                          </div>

                          {request.notes && (
                            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                              <p className="text-xs text-slate-500 font-semibold mb-1">
                                Notes
                              </p>
                              <p className="text-sm text-slate-600">
                                {request.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {request.status === "accepted" && (
                        <Button
                          type="button"
                          onClick={() =>
                            handleStatusUpdate(request._id, "in_progress")
                          }
                          disabled={processingId === request._id}
                          className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                        >
                          {processingId === request._id
                            ? "Starting..."
                            : "Start Journey"}
                        </Button>
                      )}

                      {request.status === "in_progress" && (
                        <Button
                          type="button"
                          onClick={() =>
                            handleStatusUpdate(request._id, "completed")
                          }
                          disabled={processingId === request._id}
                          className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {processingId === request._id
                            ? "Completing..."
                            : "Mark Complete"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
