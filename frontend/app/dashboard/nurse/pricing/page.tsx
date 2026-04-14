"use client";

import { useRouter } from 'next/navigation';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { useEffect, useState } from "react";
import { getFixedPrice } from '@/utils/pricing';
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee,
  Save,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Info,
  TrendingUp,
  Percent,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const NURSE_SHARE = 0.70;
const PLATFORM_SHARE = 0.30;

async function safeParseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();
  if (!rawText) return null;
  if (contentType.includes("application/json")) {
    try { return JSON.parse(rawText); } catch { throw new Error("Server returned invalid JSON response."); }
  }
  try { return JSON.parse(rawText); } catch {
    return { success: false, message: "Unexpected server response received.", raw: rawText };
  }
}

export default function NursePricingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const meRes = await fetchWithTimeout(`${API_BASE}/api/auth/me`, { credentials: "include" });
        if (meRes.status === 401) { clearStoredAuth(); router.push("/login"); return; }
        const meData = await safeParseResponse(meRes);
        if (!meRes.ok) throw new Error(meData?.message || "Failed to load user data");
        const user = meData?.data?.user || meData?.user || meData;
        const extractedUserId = meData?.data?.user?._id || meData?.user?._id || meData?.data?.user?.id || meData?.user?.id;
        if (!extractedUserId) { clearStoredAuth(); router.push("/login"); return; }
        setUserId(extractedUserId);
        setVerificationStatus(user?.verificationStatus || null);
        setServices(Array.isArray(user?.services) ? user.services : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const savePrices = async () => {
    setSaving(true);
    try {
      if (!userId) { setMessage({ type: "error", text: "User profile not loaded yet." }); return; }
      const formattedPrices: Record<string, number> = {};
      for (const service of services) {
        formattedPrices[service] = getFixedPrice(service);
      }
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/save-service-prices`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, servicePrices: formattedPrices }),
      });
      if (res.status === 401) { clearStoredAuth(); router.push("/login"); return; }
      const data = await safeParseResponse(res);
      if (!res.ok) throw new Error(data?.message || "Failed to save pricing.");
      setMessage({ type: "success", text: "Pricing saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to save pricing." });
    } finally {
      setSaving(false);
    }
  };

  // Summary calculations
  const totalPatientPayment = services.reduce(
    (sum, s) => sum + getFixedPrice(s), 0
  );
  const totalNurseEarnings = Math.round(totalPatientPayment * NURSE_SHARE);
  const totalPlatformFee = Math.round(totalPatientPayment * PLATFORM_SHARE);

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Service Pricing
            </h1>
            <p className="text-slate-500 mt-2">
              Review the platform-defined fees for each service. You receive{" "}
              <span className="font-bold text-teal-600">70%</span> of every booking —
              credited to your profile balance after service completion.
            </p>
          </div>

          {/* Revenue Split Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-teal-100 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-sm font-semibold text-teal-700">Your Share</p>
              </div>
              <p className="text-4xl font-black text-teal-800">70%</p>
              <p className="text-xs text-teal-600 mt-1">
                Est. earnings: <strong>₹{totalNurseEarnings.toLocaleString()}</strong>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Percent className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Platform Fee</p>
              </div>
              <p className="text-4xl font-black text-slate-700">30%</p>
              <p className="text-xs text-slate-500 mt-1">
                Platform fee: <strong>₹{totalPlatformFee.toLocaleString()}</strong>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-700">Total Billed</p>
              </div>
              <p className="text-4xl font-black text-emerald-800">
                ₹{totalPatientPayment.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Sum of all service prices</p>
            </motion.div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400">
              Loading your service pricing...
            </div>
          ) : verificationStatus !== "approved" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-amber-900">Pricing Locked</h2>
              <p className="text-amber-700 mt-3 text-sm">
                Your profile needs to be approved before you can configure service prices.
              </p>
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">No Services Added</h2>
              <p className="text-slate-500 mt-3 text-sm">
                Please add your services (via the Services section) before setting pricing.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Pricing Portfolio</h2>
                  <p className="text-slate-500 text-sm">
                    Patients see the full price. Your 70% earnings are credited after service completion.
                  </p>
                </div>
              </div>

              {/* Table header — desktop */}
              <div className="hidden md:grid grid-cols-[1fr_160px_160px_160px] gap-4 px-4 mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Patient Pays</p>
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider text-center">You Earn (70%)</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Platform (30%)</p>
              </div>

              <div className="space-y-3">
                {services.map((service, index) => {
                  const price = getFixedPrice(service);
                  const nurseEarning = Math.round(price * NURSE_SHARE);
                  const platformFee = Math.round(price * PLATFORM_SHARE);

                  return (
                    <motion.div
                      key={service}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      {/* Mobile layout */}
                      <div className="md:hidden space-y-3">
                        <h3 className="font-bold text-slate-800">{service}</h3>
                        <div className="relative">
                          <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <div className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold cursor-not-allowed">
                            {price}
                          </div>
                        </div>
                        {price > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-700">
                              You earn: ₹{nurseEarning}
                            </span>
                            <span className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-600">
                              Platform: ₹{platformFee}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:grid grid-cols-[1fr_160px_160px_160px] gap-4 items-center">
                        <div>
                          <h3 className="font-bold text-slate-800">{service}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Platform-defined service charge.
                          </p>
                        </div>

                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <div className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-right font-semibold cursor-not-allowed">
                            {price}
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <span className="px-4 py-2 rounded-xl bg-teal-100 text-teal-800 font-bold text-sm min-w-[80px] text-center">
                            {price > 0 ? `₹${nurseEarning}` : "—"}
                          </span>
                        </div>

                        <div className="flex justify-center">
                          <span className="px-4 py-2 rounded-xl bg-slate-200 text-slate-600 font-semibold text-sm min-w-[80px] text-center">
                            {price > 0 ? `₹${platformFee}` : "—"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Policy note */}
              <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Payment Policy:</strong> Your 70% earnings are automatically credited to your profile balance once a booking is marked complete and the patient confirms payment. The 30% platform fee covers operations, support, and secure payment processing.
                </p>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  onClick={savePrices}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Confirming..." : "Confirm Pricing"}
                  </span>
                </Button>
              </div>
            </div>
          )}

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
      </div>
    </DashboardLayout>
  );
}