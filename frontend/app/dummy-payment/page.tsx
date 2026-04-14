"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { QrCode, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function DummyPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const amount = searchParams.get("amount");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleConfirmPayment = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/payments/mark-paid/${paymentId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: "DUMMY_UPI_" + Date.now() }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment failed");

      setMessage({ type: "success", text: "Payment Successful! Redirecting..." });
      
      setTimeout(() => {
        router.push("/dashboard/patient/bookings");
      }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center border border-slate-200">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold mb-4">
          🔒 Secure Payment Gateway
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Complete Your Payment</h1>
        <p className="text-slate-500 mb-8 text-sm">Scan the QR code below with any UPI app — PhonePe, GPay, Paytm, or BHIM — to pay.</p>

        <div className="bg-slate-50 rounded-3xl p-8 mb-6 inline-flex border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-teal-50 opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <QrCode className="w-48 h-48 text-slate-800 relative z-10" strokeWidth={1} />
        </div>

        <p className="text-xs text-slate-400 mb-4">UPI ID: careconnect@upi</p>

        {amount && (
          <div className="text-4xl font-extrabold text-teal-600 mb-6 tracking-tight">
            ₹{amount}
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How to pay</p>
          <p className="text-sm text-slate-600">1. Open any UPI app on your phone</p>
          <p className="text-sm text-slate-600">2. Scan the QR code or enter UPI ID</p>
          <p className="text-sm text-slate-600">3. Enter amount ₹{amount || "—"} and confirm</p>
          <p className="text-sm text-slate-600">4. Click <strong>"I've Paid"</strong> below to confirm</p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 flex items-center justify-center gap-2 font-semibold text-sm ${message.type === "success" ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
            {message.text}
          </div>
        )}

        <button
          onClick={handleConfirmPayment}
          disabled={loading || !paymentId}
          className="w-full py-4 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {loading ? "Verifying Payment..." : "I've Paid — Confirm Payment"}
        </button>
        
        <button
          onClick={() => router.push("/dashboard/patient/bookings")}
          disabled={loading}
          className="w-full mt-4 py-4 rounded-2xl text-slate-500 font-semibold hover:bg-slate-50 transition"
        >
          Pay Later from Dashboard
        </button>
      </div>
    </div>
  );
}

export default function DummyPaymentPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }>
        <DummyPaymentContent />
      </Suspense>
    </AuthGuard>
  );
}
