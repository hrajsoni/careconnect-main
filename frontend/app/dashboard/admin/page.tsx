"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  HeartHandshake,
  Ambulance,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Modal from "@/components/Modal";
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
    throw new Error("Unexpected server response received.");
  }
}

interface Provider {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  qualification?: string;
  experience?: number;
  registrationNumber?: string;
  photo?: string;
  idProof?: string;
  licenseProof?: string;
  verificationStatus?: string;
}

interface Stats {
  pendingNurses?: number;
  approvedNurses?: number;
  rejectedNurses?: number;
  pendingCareAssistants?: number;
  approvedCareAssistants?: number;
  totalPatients?: number;
  totalBookings?: number;
  totalRevenue?: number;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [nurses, setNurses] = useState<Provider[]>([]);
  const [approvedNurses, setApprovedNurses] = useState<Provider[]>([]);
  const [rejectedNurses, setRejectedNurses] = useState<Provider[]>([]);

  const [careAssistants, setCareAssistants] = useState<Provider[]>([]);
  const [approvedCareAssistants, setApprovedCareAssistants] = useState<Provider[]>([]);
  const [rejectedCareAssistants, setRejectedCareAssistants] = useState<Provider[]>([]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"recent" | "old">("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const res = await fetchWithTimeout(`${API_BASE}/api/admin/stats`, {
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch dashboard stats");
      }

      setStats(data?.data || {});

      const nursesRes = await fetchWithTimeout(
        `${API_BASE}/api/admin/nurses?status=pending`,
        { credentials: "include" }
      );

      if (nursesRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const nursesData = await safeParseResponse(nursesRes);
      setNurses(
        Array.isArray(nursesData?.data) ? nursesData.data : []
      );

      const assistantsRes = await fetchWithTimeout(
        `${API_BASE}/api/admin/care-assistants?status=pending`,
        { credentials: "include" }
      );

      if (assistantsRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const assistantsData = await safeParseResponse(assistantsRes);
      setCareAssistants(
        Array.isArray(assistantsData?.data) ? assistantsData.data : []
      );

      setApprovedNurses([]);
      setRejectedNurses([]);
      setApprovedCareAssistants([]);
      setRejectedCareAssistants([]);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data.";
      setMessage({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const pendingProviders = useMemo(() => {
    return [...nurses, ...careAssistants];
  }, [nurses, careAssistants]);

  const filteredAndSortedProviders = useMemo(() => {
    let result = [...pendingProviders];

    if (searchQuery.trim()) {
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [pendingProviders, sortOrder, searchQuery]);

  const approveProvider = async (id: string) => {
    setProcessingId(id);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/approve/${id}`, {
        method: "PUT",
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Approval failed");
      }

      const approvedUser = data?.user || data?.nurse;
      if (approvedUser?.role === "care_assistant") {
        setCareAssistants((prev) => prev.filter((item) => item._id !== id));
        setApprovedCareAssistants((prev) => [approvedUser, ...prev]);
      } else {
        setNurses((prev) => prev.filter((item) => item._id !== id));
        setApprovedNurses((prev) => [approvedUser, ...prev]);
      }

      setMessage({
        type: "success",
        text: data?.message || "Provider approved successfully.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to approve provider.";
      setMessage({ type: "error", text: message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedProvider?._id || !rejectionReason.trim()) return;

    setProcessingId(selectedProvider._id);

    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/admin/reject/${selectedProvider._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectionReason }),
        }
      );

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Rejection failed");
      }

      const rejectedUser = data?.user || data?.nurse;

      if (rejectedUser?.role === "care_assistant") {
        setCareAssistants((prev) =>
          prev.filter((item) => item._id !== selectedProvider._id)
        );
        setRejectedCareAssistants((prev) => [rejectedUser, ...prev]);
      } else {
        setNurses((prev) =>
          prev.filter((item) => item._id !== selectedProvider._id)
        );
        setRejectedNurses((prev) => [rejectedUser, ...prev]);
      }

      setSelectedProvider(null);
      setRejectionReason("");

      setMessage({
        type: "success",
        text: data?.message || "Application rejected successfully.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reject application.";
      setMessage({ type: "error", text: message });
    } finally {
      setProcessingId(null);
    }
  };

  const nurseTotal =
    (stats?.pendingNurses || 0) +
    (stats?.approvedNurses || 0) +
    (stats?.rejectedNurses || 0);

  const assistantTotal =
    (stats?.pendingCareAssistants || 0) +
    (stats?.approvedCareAssistants || 0);

  const statCards = [
    {
      label: "Pending Nurses",
      count: stats?.pendingNurses || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      onClick: () => router.push("/dashboard/admin/nurses?status=pending"),
    },
    {
      label: "Approved Nurses",
      count: stats?.approvedNurses || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      onClick: () => router.push("/dashboard/admin/nurses?status=approved"),
    },
    {
      label: "Rejected Nurses",
      count: stats?.rejectedNurses || 0,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      onClick: () => router.push("/dashboard/admin/nurses?status=rejected"),
    },
    {
      label: "Total Nurses",
      count: nurseTotal,
      icon: ShieldCheck,
      color: "text-violet-600",
      bg: "bg-violet-50",
      onClick: () => router.push("/dashboard/admin/nurses?status=all"),
    },
    {
      label: "Pending Care Assistants",
      count: stats?.pendingCareAssistants || 0,
      icon: HeartHandshake,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      onClick: () =>
        router.push("/dashboard/admin/care-assistants?status=pending"),
    },
    {
      label: "Approved Care Assistants",
      count: stats?.approvedCareAssistants || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      onClick: () =>
        router.push("/dashboard/admin/care-assistants?status=approved"),
    },
    {
      label: "Total Patients",
      count: stats?.totalPatients || 0,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      onClick: () => router.push("/dashboard/admin/patients"),
    },
    {
      label: "Total Bookings",
      count: stats?.totalBookings || 0,
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-50",
      onClick: () => router.push("/dashboard/admin/bookings"),
    },
    {
      label: "Total Revenue",
      count: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
      onClick: () => router.push("/dashboard/admin/payments"),
    },
    {
      label: "Ambulance Requests",
      count: "View",
      icon: Ambulance,
      color: "text-red-600",
      bg: "bg-red-50",
      onClick: () => router.push("/dashboard/admin/ambulance"),
    },
  ];

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Verification Panel
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Provider Verification Queue
                </h1>
                <p className="text-slate-500 font-medium">
                  Review nurses and care assistants joining CareConnect.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-4 py-2 bg-teal-50 text-teal-700 rounded-xl font-bold text-sm">
                  {pendingProviders.length} Applications Pending
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {statCards.map((stat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={stat.onClick}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 text-left hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                    <stat.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <p className="text-3xl font-black text-slate-800">
                        {stat.count}
                      </p>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Pending Applications Pending Review
              </h2>

              {loading ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                  Loading applications...
                </div>
              ) : filteredAndSortedProviders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-500">
                  No pending provider applications found.
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredAndSortedProviders.map((provider) => (
                    <motion.div
                      key={provider._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={
                              provider.photo
                                ? `${API_BASE}/${provider.photo}`
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    provider.name || "Provider"
                                  )}&background=e2e8f0&color=0f172a&size=256`
                            }
                            alt={provider.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 grid md:grid-cols-3 gap-y-4 gap-x-6">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Applicant
                            </p>
                            <p className="font-bold text-slate-900">
                              {provider.name}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              {provider.email}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Role & Status
                            </p>
                            <p className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs capitalize mt-1">
                              {provider.role?.replace("_", " ")}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 md:justify-end md:col-start-3 md:row-start-1 md:row-span-2">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedProvider(provider)}
                              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                              disabled={processingId === provider._id}
                            >
                              Reject
                            </Button>
                            <Button
                              onClick={() => approveProvider(provider._id)}
                              className="rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20"
                              disabled={processingId === provider._id}
                            >
                              {processingId === provider._id
                                ? "Approving..."
                                : "Approve"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {(provider.idProof || provider.licenseProof) ? (
                        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider w-full flex-shrink-0">
                            Verification Documents
                          </p>

                          {provider.idProof ? (
                            <button
                              onClick={() =>
                                setPreviewUrl(`${API_BASE}/${provider.idProof}`)
                              }
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm hover:border-teal-300 transition"
                            >
                              <FileText className="w-4 h-4 text-teal-600" />
                              View ID Proof ✓
                            </button>
                          ) : (
                            <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-600">
                              ⚠ Aadhaar / ID Proof — Not Uploaded
                            </span>
                          )}

                          {provider.licenseProof ? (
                            <button
                              onClick={() =>
                                setPreviewUrl(`${API_BASE}/${provider.licenseProof}`)
                              }
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm hover:border-teal-300 transition"
                            >
                              <FileText className="w-4 h-4 text-teal-600" />
                              View License ✓
                            </button>
                          ) : (
                            <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-600">
                              ⚠ Nursing License — Not Uploaded
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                              <p className="text-sm font-bold text-red-800">No Documents Uploaded</p>
                              <p className="text-xs text-red-600 mt-0.5">
                                This nurse has not uploaded any verification documents (Aadhaar / Nursing License).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Modal
            isOpen={!!selectedProvider}
            onClose={() => {
              setSelectedProvider(null);
              setRejectionReason("");
            }}
          >
            <div className="p-2">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Reject Application
              </h2>
              <p className="text-slate-500 mb-6 text-sm">
                Please provide a reason for rejecting{" "}
                <span className="font-bold text-slate-700">
                  {selectedProvider?.name}
                </span>
                .
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 min-h-[120px] focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setSelectedProvider(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="danger"
                  className="flex-1 rounded-xl bg-rose-600 text-white font-bold"
                  onClick={handleReject}
                  disabled={
                    !rejectionReason.trim() ||
                    processingId === selectedProvider?._id
                  }
                >
                  {processingId === selectedProvider?._id
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </Modal>

          <AnimatePresence>
            {previewUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/90 backdrop-blur-sm"
                onClick={() => setPreviewUrl(null)}
              >
                <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
                  <XCircle size={40} />
                </button>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative max-w-5xl w-full max-h-full overflow-hidden rounded-3xl bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">
                      Document Inspection
                    </span>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-600 text-xs font-bold hover:underline"
                    >
                      Open Original
                    </a>
                  </div>

                  <div className="p-2 bg-slate-200 h-[70vh] flex items-center justify-center">
                    {previewUrl.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full rounded-lg"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-3 rounded-full text-white font-semibold shadow-xl flex items-center gap-2 ${
                  message.type === "success" ? "bg-teal-600" : "bg-red-500"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}