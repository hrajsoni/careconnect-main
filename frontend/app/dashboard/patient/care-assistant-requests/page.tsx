"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Clock3,
  MapPin,
  FileText,
  UserRound,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const requestOptions = [
  { value: "doctor_visit", label: "Doctor Visit Assistance" },
  { value: "medical_followup", label: "Medical Follow-up Support" },
  { value: "pickup_drop", label: "Pickup & Drop Support" },
  { value: "hospital_discharge", label: "Hospital Discharge Assistance" },
  { value: "general_assistance", label: "General Assistance" },
];

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

export default function PatientCareAssistantRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<ToastState>({ type: "", text: "" });

  const [formData, setFormData] = useState({
    requestType: "doctor_visit",
    scheduledDate: "",
    scheduledTime: "",
    pickupLocation: "",
    destination: "",
    notes: "",
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  const fetchRequests = async () => {
    const patientId = localStorage.getItem("userId");
    if (!patientId) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);

      const res = await fetchWithTimeout(
        `${API_BASE}/api/care-assistant-requests/patient/${patientId}`,
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

      setRequests(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      showMessage("error", error.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    const patientId = localStorage.getItem("userId");
    if (!patientId) {
      router.push("/login");
      return;
    }

    if (
      !formData.requestType ||
      !formData.scheduledDate ||
      !formData.scheduledTime ||
      !formData.pickupLocation.trim() ||
      !formData.destination.trim()
    ) {
      showMessage("error", "Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetchWithTimeout(`${API_BASE}/api/care-assistant-requests`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: formData.requestType,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          pickupLocation: formData.pickupLocation.trim(),
          destination: formData.destination.trim(),
          notes: formData.notes.trim(),
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create request");
      }

      setFormData({
        requestType: "doctor_visit",
        scheduledDate: "",
        scheduledTime: "",
        pickupLocation: "",
        destination: "",
        notes: "",
      });

      showMessage("success", data?.message || "Request created successfully.");
      await fetchRequests();
    } catch (error: any) {
      showMessage("error", error.message || "Unable to create request.");
    } finally {
      setSubmitting(false);
    }
  };

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
                Request Care Assistant Support
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl">
                Request accompaniment, follow-up support, pickup and drop help,
                or general medical assistance for your care journey.
              </p>
            </div>

            <div className="grid xl:grid-cols-[1fr_1.1fr] gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  New Request
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Request Type
                    </label>
                    <select
                      name="requestType"
                      value={formData.requestType}
                      onChange={handleChange}
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {requestOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={formData.scheduledDate}
                        onChange={handleChange}
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        name="scheduledTime"
                        value={formData.scheduledTime}
                        onChange={handleChange}
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Pickup Location
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                try {
                                  const { latitude, longitude } = position.coords;
                                  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                                  const data = await response.json();
                                  setFormData(prev => ({
                                    ...prev,
                                    pickupLocation: data.display_name || `${latitude}, ${longitude}`
                                  }));
                                  showMessage("success", "Location detected successfully");
                                } catch (error) {
                                  const { latitude, longitude } = position.coords;
                                  setFormData(prev => ({
                                    ...prev,
                                    pickupLocation: `${latitude}, ${longitude}`
                                  }));
                                }
                              },
                              (error) => {
                                showMessage("error", "Unable to detect location. Please type manually.");
                              }
                            );
                          } else {
                            showMessage("error", "Geolocation is not supported by your browser.");
                          }
                        }}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-md"
                      >
                        <MapPin className="w-3 h-3" />
                        Use Current
                      </button>
                    </div>
                    <input
                      type="text"
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      placeholder="Enter pickup location"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Destination
                    </label>
                    <input
                      type="text"
                      name="destination"
                      value={formData.destination}
                      onChange={handleChange}
                      placeholder="Hospital / clinic / home destination"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add any specific assistance needs..."
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 min-h-[120px]"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                  >
                    {submitting ? "Submitting..." : "Create Request"}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  My Requests
                </h2>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                    Loading requests...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400">
                    No care assistant requests created yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
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

                        <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-teal-500" />
                            {request.scheduledDate}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-teal-500" />
                            {request.scheduledTime}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            Pickup: {request.pickupLocation}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            Destination: {request.destination}
                          </div>
                        </div>

                        {request.notes && (
                          <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4 text-teal-500 mt-0.5" />
                            <span>{request.notes}</span>
                          </div>
                        )}

                        {request.careAssistant && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-700 font-medium">
                            <UserRound className="w-4 h-4 text-teal-500" />
                            Assigned Assistant: {request.careAssistant.name}
                          </div>
                        )}

                        {request.status === "pending" && (
                          <div className="mt-4">
                            <Button
                              type="button"
                              onClick={async () => {
                                try {
                                  
                                  

                                  const res = await fetchWithTimeout(
                                    `${API_BASE}/api/care-assistant-requests/patient-cancel/${request._id}`,
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
                                    throw new Error(
                                      data?.message ||
                                        "Failed to cancel request"
                                    );
                                  }

                                  showMessage(
                                    "success",
                                    data?.message ||
                                      "Request cancelled successfully."
                                  );
                                  await fetchRequests();
                                } catch (error: any) {
                                  console.error(
                                    "PATIENT CANCEL REQUEST ERROR:",
                                    error
                                  );
                                  showMessage(
                                    "error",
                                    error.message ||
                                      "Unable to cancel request."
                                  );
                                }
                              }}
                              className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
                            >
                              Cancel Request
                            </Button>
                          </div>
                        )}
                      </div>
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
