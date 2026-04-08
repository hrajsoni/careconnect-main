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
        // Prevents wiping unrelated app data (e.g. theme prefs) on session expiry
          ["token", "role", "userId"].forEach((k) => localStorage.removeItem(k));
        router.push("/login");
        return;
      }
      
      const meData = await meRes.json();
      const fetchedNurseId = meData?.user?._id || meData?.user?.id;
      setNurseId(fetchedNurseId);

      const res = await fetchWithTimeout(`${API_BASE}/api/payments/nurse/${fetchedNurseId}`, {
        credentials: "include",
      });
      
      if (res.status === 401) {
        // Prevents wiping unrelated app data (e.g. theme prefs) on session expiry
          ["token", "role", "userId"].forEach((k) => localStorage.removeItem(k));
        router.push("/login");
        return;
      }
      
      const data = await res.json();

      if (res.ok) {
        setPayments(Array.isArray(data) ? data : []);
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
            <div className="grid gap-6">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment._id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
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
                  </div>
                </motion.div>
              ))}
            </div>
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
