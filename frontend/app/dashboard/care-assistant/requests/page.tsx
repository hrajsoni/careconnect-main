"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  HeartHandshake,
  Clock3,
  CheckCircle2,
  Users,
  AlertCircle,
  MapPin,
  CalendarDays,
  FileText,
  UserRound,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type ToastState = {
  type: "success" | "error" | "";
  text: string;
};

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

export default function CareAssistantRequestsPage() {
  const router = useRouter();
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ToastState>({ type: "", text: "" });

  const assistantId =
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  const fetchData = async () => {
    if (!assistantId) {
      setOpenRequests([]);
      setMyRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [openRes, myRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/care-assistant-requests/open`, {
          credentials: "include",
        }),
        fetchWithTimeout(`${API_BASE}/api/care-assistant-requests/assistant/${assistantId}`, {
          credentials: "include",
        }),
      ]);

      if (openRes.status === 401 || myRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const openData = await safeParseResponse(openRes);
      const myData = await safeParseResponse(myRes);

      if (!openRes.ok) {
        throw new Error(openData?.message || "Failed to load open requests");
      }

      if (!myRes.ok) {
        throw new Error(myData?.message || "Failed to load assigned requests");
      }

      setOpenRequests(Array.isArray(openData?.data) ? openData.data : []);
      setMyRequests(Array.isArray(myData?.data) ? myData.data : []);
    } catch (error: any) {
      showMessage("error", error.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assistantId]);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleAccept = async (requestId: string) => {
    try {
      setProcessingId(requestId);

      const res = await fetchWithTimeout(
        `${API_BASE}/api/care-assistant-requests/accept/${requestId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        const responseMessage = data && typeof data === "object" ? (data as any).message : null;
        throw new Error(responseMessage || "Failed to accept request");
      }

      const responseMessage = data && typeof data === "object" ? (data as any).message : null;
      showMessage("success", responseMessage || "Request accepted successfully.");
      await fetchData();
    } catch (error: any) {
      showMessage("error", error.message || "Unable to accept request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    status: "in_progress" | "completed" | "cancelled"
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
          body: JSON.stringify({
            status,
          }),
        }
      );
      
      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        const responseMessage = data && typeof data === "object" ? (data as any).message : null;
        throw new Error(responseMessage || "Failed to update request");
      }

      const responseMessage = data && typeof data === "object" ? (data as any).message : null;
      showMessage("success", responseMessage || "Request updated successfully.");
      await fetchData();
    } catch (error: any) {
      showMessage("error", error.message || "Unable to update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const stats = [
    {
      title: "Open Requests",
      value: String(openRequests.length),
      icon: <Clock3 className="w-5 h-5" />,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "My Assigned Requests",
      value: String(myRequests.length),
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Patients Assisted",
      value: String(myRequests.filter((r) => r.status === "completed").length),
      icon: <Users className="w-5 h-5" />,
      color: "bg-teal-50 text-teal-700 border-teal-100",
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                <HeartHandshake className="w-4 h-4" />
                Care Assistant Requests
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Support Requests
              </h1>
              <p className="text-slate-500 mt-2 max-w-2xl">
                View open patient requests, accept assistance tasks, and manage
                assigned support work.
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
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading requests...
              </div>
            ) : (
              <div className="grid xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Open Requests
                  </h2>

                  {openRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400">
                      No open requests available right now.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {openRequests.map((request) => (
                        <div
                          key={request._id}
                          className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
                        >
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                              {request.requestType?.replace(/_/g, " ")}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase">
                              {request.status}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <UserRound className="w-4 h-4 text-teal-500" />
                              Patient: {request.patient?.name || "Unknown"}
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              {request.scheduledDate} at {request.scheduledTime}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-500" />
                              Pickup: {request.pickupLocation}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-500" />
                              Destination: {request.destination}
                            </div>
                            {request.notes && (
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-teal-500 mt-0.5" />
                                <span>{request.notes}</span>
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleAccept(request._id)}
                            disabled={processingId === request._id}
                            className="mt-4 w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                          >
                            {processingId === request._id
                              ? "Accepting..."
                              : "Accept Request"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    My Assigned Requests
                  </h2>

                  {myRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400">
                      You have not accepted any requests yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myRequests.map((request) => (
                        <div
                          key={request._id}
                          className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
                        >
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                              {request.requestType?.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                request.status === "accepted"
                                  ? "bg-blue-50 text-blue-700"
                                  : request.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : request.status === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <UserRound className="w-4 h-4 text-teal-500" />
                              Patient: {request.patient?.name || "Unknown"}
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              {request.scheduledDate} at {request.scheduledTime}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-500" />
                              Pickup: {request.pickupLocation}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-500" />
                              Destination: {request.destination}
                            </div>
                            {request.notes && (
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-teal-500 mt-0.5" />
                                <span>{request.notes}</span>
                              </div>
                            )}
                          </div>

                          {request.status === "accepted" && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(request._id, "in_progress")
                                }
                                disabled={processingId === request._id}
                                className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Start Task
                              </Button>

                              <Button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(request._id, "cancelled")
                                }
                                disabled={processingId === request._id}
                                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {request.status === "in_progress" && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(request._id, "completed")
                                }
                                disabled={processingId === request._id}
                                className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Complete
                              </Button>

                              <Button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(request._id, "cancelled")
                                }
                                disabled={processingId === request._id}
                                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <AnimatePresence>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
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
    </AuthGuard>
  );
}
