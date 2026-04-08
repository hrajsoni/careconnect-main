"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee,
  Save,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";

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
    return {
      success: false,
      message: "Unexpected server response received.",
      raw: rawText,
    };
  }
}

export default function NursePricingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

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

        const meData = await safeParseResponse(meRes);

        if (!meRes.ok) {
          throw new Error(meData?.message || "Failed to load user data");
        }

        const user = meData?.data?.user || meData?.user || meData;
        const extractedUserId = user?._id || user?.id;

        setUserId(extractedUserId);
        setVerificationStatus(user?.verificationStatus || null);
        setServices(Array.isArray(user?.services) ? user.services : []);

        const prices: Record<string, string> = {};
        const rawPrices = user?.servicePrices || {};

        Object.keys(rawPrices).forEach((key) => {
          prices[key] = String(rawPrices[key]);
        });

        setServicePrices(prices);
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
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handlePriceChange = (service: string, value: string) => {
    setServicePrices((prev) => ({
      ...prev,
      [service]: value,
    }));
  };

  const savePrices = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage({ type: "error", text: "You are not logged in." });
        return;
      }

      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      const formattedPrices: Record<string, number> = {};
      for (const service of services) {
        const value = servicePrices[service];
        if (value && !isNaN(Number(value))) {
          formattedPrices[service] = Number(value);
        }
      }

      const res = await fetchWithTimeout(`${API_BASE}/api/auth/save-service-prices`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          id: userId,
          servicePrices: formattedPrices,
        }),
      });

      if (res.status === 401) {
        // Prevents wiping unrelated app data (e.g. theme prefs) on session expiry
        ["token", "role", "userId"].forEach((k) => localStorage.removeItem(k));
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save pricing.");
      }

      setMessage({ type: "success", text: "Pricing saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to save pricing." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Service Pricing
            </h1>
            <p className="text-slate-500 mt-2">
              Set your professional fees for each service you provide.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400">
              Loading pricing data...
            </div>
          ) : verificationStatus !== "approved" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-amber-900">
                Pricing setup is locked
              </h2>
              <p className="text-amber-700 mt-3">
                Your profile must be approved before setting service prices.
              </p>
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                No services selected yet
              </h2>
              <p className="text-slate-500 mt-3">
                Please add your services first before setting pricing.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Pricing Portfolio
                  </h2>
                  <p className="text-slate-500">
                    Patients will see these service charges on your profile.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {services.map((service) => (
                  <motion.div
                    key={service}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid md:grid-cols-[1fr_220px] gap-4 items-center rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800">{service}</h3>
                      <p className="text-sm text-slate-500">
                        Enter your standard fee for this service.
                      </p>
                    </div>

                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter price"
                        value={servicePrices[service] || ""}
                        onChange={(e) => handlePriceChange(service, e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  type="button"
                  onClick={savePrices}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving Pricing..." : "Save Pricing"}
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
