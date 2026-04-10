"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  HeartHandshake,
  Search,
  ArrowUpDown,
  UserRound,
  MapPin,
  CalendarDays,
  FileText,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
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

  throw new Error("Unexpected server response received.");
}

export default function AdminCareAssistantRequestsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState("");

  const fetchRequests = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError("");

      
      

      const res = await fetchWithTimeout(`${API_BASE}/api/care-assistant-requests/admin/all`, {
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch care assistant requests");
      }

      setRecords(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      setError(err.message || "Unable to load care assistant requests.");
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      result = result.filter(
        (item) =>
          item.requestType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.careAssistant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.pickupLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.destination?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    result.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return result;
  }, [records, searchQuery, statusFilter]);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                <HeartHandshake className="w-4 h-4" />
                Admin Care Assistant Requests
              </div>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    Care Assistant Requests
                  </h1>
                  <p className="text-slate-500 font-medium mt-2">
                    View all patient support requests, assignments, and request statuses.
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
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {["all", "pending", "accepted", "in_progress", "completed"].map((status) => (
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
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                Loading care assistant requests...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl">
                {error}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">
                  {records.length === 0 ? "No requests found" : "No matching requests"}
                </h3>
                <p className="text-slate-500 mt-2">
                  {records.length === 0
                    ? "Care assistant requests will appear here once created."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredRecords.map((request, index) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                        {request.requestType?.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          request.status === "accepted"
                            ? "bg-blue-50 text-blue-700"
                            : request.status === "in_progress"
                            ? "bg-orange-50 text-orange-700"
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

                    <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <UserRound className="w-4 h-4 text-teal-500" />
                        Patient: {request.patient?.name || "Unknown"}
                      </div>

                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-500" />
                        Assistant: {request.careAssistant?.name || "Not assigned"}
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

                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-teal-500" />
                        Created:{" "}
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>

                    {request.notes && (
                      <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                        <FileText className="w-4 h-4 text-teal-500 mt-0.5" />
                        <span>{request.notes}</span>
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