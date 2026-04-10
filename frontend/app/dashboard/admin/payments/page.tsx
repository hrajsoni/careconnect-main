"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  UserRound,
  Stethoscope,
  DollarSign,
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
    throw new Error("Unexpected server response received.");
  }
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPayments = async () => {
    try {
      setError("");
      
      

      const res = await fetchWithTimeout(`${API_BASE}/api/admin/payments`, {
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch payments");
      }

      const paymentsList = Array.isArray(data?.data) ? data.data : [];
      setPayments(paymentsList);

      // Calculate total revenue from paid payments
      const revenue = paymentsList.reduce((sum: number, payment: any) => {
        return payment.status === "paid" ? sum + (payment.amount || 0) : sum;
      }, 0);
      setTotalRevenue(revenue);
    } catch (error) {
      setError((error as any).message || "Failed to load payments");
      setPayments([]);
      setTotalRevenue(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleMarkPaid = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);

      
      

      const res = await fetchWithTimeout(`${API_BASE}/api/payments/mark-paid/${paymentId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          method: "manual",
          reference: `ADMIN-PAY-${Date.now()}`,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Unable to update payment");
      }

      setMessage({
        type: "success",
        text: "Payment marked as paid successfully.",
      });

      fetchPayments();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to mark payment as paid.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayments = useMemo(() => {
    return statusFilter === "all"
      ? payments
      : payments.filter((payment) => payment.status === statusFilter);
  }, [payments, statusFilter]);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Payment Records
                </h1>
                <p className="text-slate-500 mt-2">
                  Monitor all platform transactions, pending payments, and completed service payments.
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600 font-semibold">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      ₹{totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "pending", "paid", "refunded", "failed"].map((status) => (
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
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading payments...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl">
                {error}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">
                  No payment records found
                </h3>
                <p className="text-slate-500 mt-2">
                  Payment records will appear here after bookings are created.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredPayments.map((payment, index) => (
                  <motion.div
                    key={payment._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              payment.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {payment.status}
                          </span>

                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                            {payment.method}
                          </span>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900">
                          {payment.bookingId?.service || "Service Payment"}
                        </h2>

                        <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <UserRound className="w-4 h-4 text-teal-500" />
                            Patient: {payment.patientId?.name || "Unknown"}
                          </div>

                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-teal-500" />
                            Nurse: {payment.nurseId?.name || "Unknown"}
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-teal-500" />
                            Booking Date: {payment.bookingId?.date || "Not set"}
                          </div>

                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-teal-500" />
                            Amount: ₹{payment.amount || 0}
                          </div>
                        </div>

                        {payment.reference && (
                          <p className="mt-3 text-xs text-slate-500">
                            Reference: {payment.reference}
                          </p>
                        )}

                        {payment.paidAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            Paid on: {new Date(payment.paidAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {payment.status !== "paid" && (
                        <div>
                          <Button
                            type="button"
                            onClick={() => handleMarkPaid(payment._id)}
                            disabled={processingId === payment._id}
                            className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                          >
                            {processingId === payment._id
                              ? "Processing..."
                              : "Mark as Paid"}
                          </Button>
                        </div>
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
    </AdminGuard>
  );
}