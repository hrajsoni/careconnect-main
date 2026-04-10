"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ArrowUpDown,
  ShieldCheck,
  UserRound,
  Mail,
  Phone,
  MapPin,
  Calendar,
  HeartHandshake,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
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

function AdminCareAssistantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "all";

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "old">("recent");
  const [error, setError] = useState("");

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      setError("");

      
      

      const res = await fetchWithTimeout(
        `${API_BASE}/api/admin/care-assistants?status=${status}`,
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
        throw new Error(data?.message || "Failed to fetch care assistant records");
      }

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setRecords(list);
    } catch (err: any) {
      setError(err.message || "Unable to load care assistant records.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, [status]);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sortOrder === "recent" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [records, searchQuery, sortOrder]);

  const titleMap: Record<string, string> = {
    pending: "Pending Care Assistant Requests",
    approved: "Approved Care Assistants",
    rejected: "Rejected Care Assistants",
    all: "All Care Assistant Records",
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                <HeartHandshake className="w-4 h-4" />
                Admin Care Assistant Records
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {titleMap[status] || "Care Assistant Records"}
              </h1>
              <p className="text-slate-500 font-medium mt-2">
                View and manage care assistant records across the platform.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name, email or location..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 p-1 rounded-xl">
                <button
                  onClick={() => setSortOrder("recent")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    sortOrder === "recent"
                      ? "bg-white shadow-sm text-teal-600"
                      : "hover:text-slate-900"
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortOrder("old")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    sortOrder === "old"
                      ? "bg-white shadow-sm text-teal-600"
                      : "hover:text-slate-900"
                  }`}
                >
                  Oldest
                </button>
                <ArrowUpDown size={16} className="mx-2 text-slate-400" />
              </div>
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                Loading care assistant records...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl">
                {error}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-500">
                No care assistant records found for this filter.
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredRecords.map((assistant, index) => (
                  <motion.div
                    key={assistant._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={
                            assistant.photo
                              ? `${API_BASE}/${assistant.photo}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  assistant.name || "Care Assistant"
                                )}&background=e2e8f0&color=0f172a&size=256`
                          }
                          alt={assistant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <UserRound className="w-4 h-4 text-teal-600" />
                            Full Name
                          </div>
                          <p className="font-semibold text-slate-900">
                            {assistant.name || "Not available"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <Mail className="w-4 h-4 text-teal-600" />
                            Email
                          </div>
                          <p className="font-semibold text-slate-900 break-all">
                            {assistant.email || "Not available"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <Phone className="w-4 h-4 text-teal-600" />
                            Phone
                          </div>
                          <p className="font-semibold text-slate-900">
                            {assistant.phone || "Not available"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <MapPin className="w-4 h-4 text-teal-600" />
                            Location
                          </div>
                          <p className="font-semibold text-slate-900">
                            {assistant.location || "Not available"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <ShieldCheck className="w-4 h-4 text-teal-600" />
                            Verification Status
                          </div>
                          <p className="font-semibold text-slate-900 capitalize">
                            {assistant.verificationStatus || "Not available"}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <Calendar className="w-4 h-4 text-teal-600" />
                            Joined
                          </div>
                          <p className="font-semibold text-slate-900">
                            {assistant.createdAt
                              ? new Date(assistant.createdAt).toLocaleDateString()
                              : "Not available"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {assistant.rejectionReason && (
                      <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-4">
                        <p className="text-sm font-semibold text-rose-700 mb-1">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-rose-600">
                          {assistant.rejectionReason}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}

export default function AdminCareAssistantsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading care assistant records...
        </div>
      }
    >
      <AdminCareAssistantsPageContent />
    </Suspense>
  );
}