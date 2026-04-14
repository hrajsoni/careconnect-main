"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  ClipboardList,
  CalendarDays,
  UserRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function NursePaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nurseId, setNurseId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const fetchPayments = async () => {
    
    

    try {
      const meRes = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      
      if (meRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      
      const meData = await meRes.json();
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

      const res = await fetchWithTimeout(`${API_BASE}/api/payments/nurse/${fetchedNurseId}`, {
        credentials: "include",
      });
      
      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      
      const data = await res.json();

      if (res.ok) {
        const paymentList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setPayments(paymentList);
      } else {
        setMessage({ type: "error", text: data.error || data.message || "Failed to fetch payments." });
        setPayments([]);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to fetch payments." });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Payment Records
            </h1>
            <p className="text-slate-500 mt-2">
              Track payment status and service amounts for your assigned bookings.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">
                No payment records yet
              </h3>
              <p className="text-slate-500 mt-2">
                Payment records will appear here when patients start booking and paying.
              </p>
            </div>
          ) : (
            <>
              {/* Earnings summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5">
                  <p className="text-sm text-teal-700 font-semibold">Total Billed</p>
                  <p className="text-3xl font-black text-teal-800 mt-2">
                    ₹{payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)}
                  </p>
                  <p className="text-xs text-teal-600 mt-1">Across all bookings</p>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm text-emerald-700 font-semibold">Your Earnings (70%)</p>
                  <p className="text-3xl font-black text-emerald-800 mt-2">
                    ₹{Math.round(payments.filter(p => p.status === "paid").reduce((s, p) => s + (Number(p.nurseEarnings) || Number(p.amount) * 0.7 || 0), 0))}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">From confirmed payments</p>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm text-amber-700 font-semibold">Pending</p>
                  <p className="text-3xl font-black text-amber-800 mt-2">
                    {payments.filter(p => p.status !== "paid").length}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Awaiting patient payment</p>
                </div>
              </div>

              <div className="grid gap-6">
                {payments.map((payment, index) => {
                  const nurseEarnings = payment.nurseEarnings || Math.round(Number(payment.amount || 0) * 0.7);
                  const platformFee = payment.platformFee || Math.round(Number(payment.amount || 0) * 0.3);

                  return (
                    <motion.div
                      key={payment._id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        <div className="flex-1">
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

                          <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <UserRound className="w-4 h-4 text-teal-500" />
                              Patient: {payment.patientId?.name || "Unknown"}
                            </div>

                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              Booking Date: {payment.bookingId?.date || "Not set"}
                            </div>

                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-teal-500" />
                              Patient Paid: ₹{payment.amount || 0}
                            </div>
                          </div>

                          {/* Revenue split breakdown */}
                          <div className="mt-4 flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 border border-teal-200">
                              <span className="text-xs font-semibold text-teal-600">Your Earnings (70%)</span>
                              <span className="text-base font-black text-teal-800">₹{nurseEarnings}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200">
                              <span className="text-xs font-semibold text-slate-500">Platform Fee (30%)</span>
                              <span className="text-base font-bold text-slate-700">₹{platformFee}</span>
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
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        
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
    </DashboardLayout>
  );
}

