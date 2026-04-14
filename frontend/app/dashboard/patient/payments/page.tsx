"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  UserRound,
  RefreshCw,
  BadgeIndianRupee,
  QrCode,
  Shield,
  X,
  Smartphone,
  BadgeCheck,
  Timer,
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

  if (!rawText) {
    return null;
  }

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
    return {
      success: false,
      message:
        "Unexpected server response received. Please check backend route/configuration.",
      raw: rawText,
    };
  }
}

// ─── Dummy QR Payment Modal ────────────────────────────────────────────────
function QRPaymentModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"qr" | "processing" | "done">("qr");
  const [countdown, setCountdown] = useState(5);
  const txnId = `CC${Date.now().toString().slice(-8)}`;

  // Fake payment processing after user clicks confirm
  const handleConfirmPayment = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("done");
    }, 2000);
  };

  // Count down then auto-close after done
  useEffect(() => {
    if (step !== "done") return;
    if (countdown <= 0) {
      onSuccess();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Build a dummy UPI QR data URL using a free QR API
  const amount = payment?.amount || 0;
  const serviceName = payment?.bookingId?.service || "Healthcare Service";
  const upiString = `upi://pay?pa=careconnect@axisbank&pn=CareConnect&am=${amount}&cu=INR&tn=${encodeURIComponent(serviceName)}&tr=${txnId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white/20 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Secure Payment</h2>
          </div>
          <p className="text-teal-100 text-sm">CareConnect — Trusted Healthcare Platform</p>
        </div>

        <div className="p-6">
          {step === "qr" && (
            <div className="space-y-5">
              {/* Service & amount info */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Payment Details</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{serviceName}</p>
                    <p className="text-sm text-slate-500">
                      Nurse: {payment?.nurseId?.name || "Assigned Nurse"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-teal-700">₹{amount}</p>
                    <p className="text-xs text-slate-400">Total amount</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center py-4">
                <p className="text-sm font-semibold text-slate-700 mb-4">
                  Scan with any UPI app to pay
                </p>
                <div className="p-3 rounded-2xl border-4 border-teal-500 bg-white shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="Payment QR Code"
                    width={200}
                    height={200}
                    className="rounded-xl"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-teal-500" />
                  <p className="text-xs text-slate-500 font-medium">
                    GPay · PhonePe · Paytm · Any UPI App
                  </p>
                </div>
                <div className="mt-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-500 font-mono">
                  Txn ID: {txnId}
                </div>
              </div>

              {/* Security badge */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-green-50 border border-green-200 rounded-xl p-3">
                <Shield className="w-4 h-4 text-green-600 shrink-0" />
                <span>256-bit encrypted · Compliant with RBI guidelines · PCI-DSS secured</span>
              </div>

              {/* After scanning QR, click "I've Paid" */}
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  I Have Paid — Confirm Payment
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center py-12 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
              <p className="text-xl font-bold text-slate-900">Verifying Payment...</p>
              <p className="text-slate-500 text-sm">Please wait while we confirm your transaction</p>
            </div>
          )}

          {step === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 space-y-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
              >
                <BadgeCheck className="w-10 h-10 text-green-600" />
              </motion.div>
              <div>
                <p className="text-2xl font-black text-slate-900">Payment Successful!</p>
                <p className="text-slate-500 text-sm mt-1">
                  ₹{amount} paid for {serviceName}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-mono text-slate-600">
                Ref: {txnId}
              </div>
              <div className="flex items-center gap-2 text-sm text-teal-600 font-medium">
                <Timer className="w-4 h-4" />
                Closing in {countdown}s...
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Payments Page ────────────────────────────────────────────────────
export default function PatientPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ToastState>({ type: "", text: "" });
  const [qrPayment, setQrPayment] = useState<any | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  const fetchPayments = async (showLoader = true) => {
    const patientId = localStorage.getItem("userId");

    if (!patientId) {
      router.push("/login");
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await fetchWithTimeout(`${API_BASE}/api/payments/patient/${patientId}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch payment records.");
      }

      const paymentList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setPayments(paymentList);
    } catch (error: any) {
      setPayments([]);
      showMessage("error", error.message || "Unable to load payment records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments(true);
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const paymentStats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.status === "paid").length;
    const pending = payments.filter((p) => p.status !== "paid").length;
    const totalAmount = payments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return { total, paid, pending, totalAmount };
  }, [payments]);

  // Called after QR modal confirms payment — mark as paid on backend
  const completePayment = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);

      const res = await fetchWithTimeout(`${API_BASE}/api/payments/mark-paid/${paymentId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "online",
          reference: `CC-QR-${Date.now()}`,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Payment failed.");
      }

      showMessage("success", "Payment confirmed successfully! 🎉");
      await fetchPayments(false);
    } catch (error: any) {
      showMessage("error", error.message || "Unable to complete payment.");
    } finally {
      setProcessingId(null);
      setQrPayment(null);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Payment Records
                </h1>
                <p className="text-slate-500 mt-2 max-w-2xl">
                  Track your pending charges, completed transactions, and
                  booking-linked payment activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchPayments(false)}
                disabled={refreshing || loading}
                className="rounded-2xl px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 font-semibold transition disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>
            </div>

            {!loading && payments.length > 0 && (
              <div className="grid md:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500 font-semibold">
                    Total Records
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                    {paymentStats.total}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <p className="text-sm text-emerald-700 font-semibold">
                    Paid
                  </p>
                  <p className="text-3xl font-black text-emerald-800 mt-2">
                    {paymentStats.paid}
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <p className="text-sm text-amber-700 font-semibold">
                    Pending
                  </p>
                  <p className="text-3xl font-black text-amber-800 mt-2">
                    {paymentStats.pending}
                  </p>
                </div>

                <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
                  <p className="text-sm text-teal-700 font-semibold">
                    Total Amount
                  </p>
                  <p className="text-3xl font-black text-teal-800 mt-2">
                    ₹{paymentStats.totalAmount}
                  </p>
                </div>
              </div>
            )}

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
                  Payment records will appear here after you create bookings.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {payments.map((payment, index) => {
                  const paymentStatus = payment.status || "pending";
                  const bookingStatus = payment.bookingId?.status || "pending";

                  return (
                    <motion.div
                      key={payment._id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              Payment: {paymentStatus}
                            </span>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                bookingStatus === "accepted"
                                  ? "bg-blue-50 text-blue-700"
                                  : bookingStatus === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : bookingStatus === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Booking: {bookingStatus}
                            </span>

                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                              {payment.method || "Not set"}
                            </span>
                          </div>

                          <h2 className="text-2xl font-bold text-slate-900">
                            {payment.bookingId?.service || "Service Payment"}
                          </h2>

                          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <UserRound className="w-4 h-4 text-teal-500" />
                              Nurse: {payment.nurseId?.name || "Assigned Nurse"}
                            </div>

                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              Booking Date: {payment.bookingId?.date || "Not set"}
                            </div>

                            <div className="flex items-center gap-2">
                              <BadgeIndianRupee className="w-4 h-4 text-teal-500" />
                              Amount: ₹{payment.amount || 0}
                            </div>

                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-teal-500" />
                              Time: {payment.bookingId?.time || "Not set"}
                            </div>
                          </div>

                          {payment.reference && (
                            <p className="mt-3 text-xs text-slate-500 break-all">
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
                          <div className="lg:min-w-[200px]">
                            <Button
                              type="button"
                              onClick={() => setQrPayment(payment)}
                              disabled={processingId === payment._id}
                              className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                            >
                              <span className="inline-flex items-center gap-2">
                                <QrCode className="w-4 h-4" />
                                {processingId === payment._id
                                  ? "Processing..."
                                  : "Pay Now"}
                              </span>
                            </Button>
                            <p className="text-xs text-center text-slate-400 mt-2">
                              Secure UPI / QR Payment
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
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

        {/* QR Payment Modal */}
        <AnimatePresence>
          {qrPayment && (
            <QRPaymentModal
              payment={qrPayment}
              onClose={() => setQrPayment(null)}
              onSuccess={() => completePayment(qrPayment._id)}
            />
          )}
        </AnimatePresence>
      </DashboardLayout>
    </AuthGuard>
  );
}
