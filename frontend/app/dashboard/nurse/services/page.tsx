"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { getFixedPrice } from '@/utils/pricing';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  User,
  ShieldCheck,
  ChevronDown,
  Plus,
  Sparkles,
  Pencil,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const SERVICE_BUNDLES = [
  {
    title: "Basic Medical Services",
    icon: <Stethoscope className="w-5 h-5" />,
    services: [
      "Injection (IV / IM)",
      "Blood Pressure Monitoring",
      "Blood Sugar Check",
      "Temperature Check",
      "Oxygen Level Monitoring",
      "Wound Dressing",
      "Bandage Change",
      "First Aid Care",
      "IV Fluid Administration",
      "Catheter Care",
      "Enema Administration",
    ],
  },
  {
    title: "Elderly Care",
    icon: <User className="w-5 h-5" />,
    services: [
      "Bedridden Patient Care",
      "Daily Hygiene",
      "Feeding Assistance",
      "Mobility Support",
      "Fall Prevention",
      "Dementia Support",
    ],
  },
  {
    title: "Home Nursing Care",
    icon: <ShieldCheck className="w-5 h-5" />,
    services: [
      "12-hour Nursing",
      "24-hour Nursing",
      "ICU Setup at Home",
      "Post Hospital Care",
      "Critical Monitoring",
    ],
  },
];

export default function NurseServicesPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [customService, setCustomService] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);
  const [hasSavedServices, setHasSavedServices] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadUser = async () => {
      
      // verificationStatus is loaded fresh from /me below — no localStorage pre-read needed

      

      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });
        if (res.status === 401) {
          clearStoredAuth();
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (res.ok && (data.data?.user ?? data.user)) {
          const user = data.data?.user ?? data.user; // support both old and new shape

          const fetchedNurseId =
            data?.data?.user?._id ||
            data?.user?._id ||
            data?.data?.user?.id ||
            data?.user?.id;

          if (!fetchedNurseId) {
            clearStoredAuth();
            router.push("/login");
            return;
          }

          setUserId(fetchedNurseId);
          setVerificationStatus(user.verificationStatus || null);
          const savedServices = Array.isArray(user.services)
            ? user.services : [];
          setSelectedServices(savedServices);
          setHasSavedServices(savedServices.length > 0);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadUser();
  }, [router]);

  const saveServices = async () => {
    setSavingServices(true);

    try {
      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      const trimmedCustomService = customService.trim();
      const finalServices = [...selectedServices];

      if (trimmedCustomService && !finalServices.includes(trimmedCustomService)) {
        finalServices.push(trimmedCustomService);
      }

      if (finalServices.length === 0) {
        setMessage({ type: "error", text: "Please select at least one service." });
        return;
      }

      const res = await fetchWithTimeout(`${API_BASE}/api/auth/save-services`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          id: userId,
          services: finalServices,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save services.");
      }

      setSelectedServices(finalServices);
      setHasSavedServices(true);
      setIsEditingServices(false);
      setCustomService("");
      setMessage({ type: "success", text: "Services saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to save services." });
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              My Services
            </h1>
            <p className="text-slate-500 mt-2">
              Configure the services visible on your CareConnect professional profile.
            </p>
          </div>

          {verificationStatus !== "approved" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-amber-900">
                Service setup is locked
              </h2>
              <p className="text-amber-700 mt-3">
                Your profile must be approved before you can manage professional services.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Service Portfolio
                    </h2>
                    <p className="text-slate-500">
                      Choose and maintain the care services you provide.
                    </p>
                  </div>
                </div>

                {hasSavedServices && !isEditingServices && (
                  <Button
                    type="button"
                    onClick={() => setIsEditingServices(true)}
                    className="rounded-2xl bg-slate-900 text-white px-5 py-3 hover:bg-slate-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Modify Services
                    </span>
                  </Button>
                )}
              </div>

              {hasSavedServices && !isEditingServices ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-white shadow-sm text-teal-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        Selected Services
                      </h3>
                      <p className="text-sm text-slate-500">
                        These services are currently listed on your profile.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selectedServices.map((service, index) => (
                      <motion.div
                        key={service}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                        className="px-4 py-2 rounded-full bg-white border border-teal-200 text-slate-700 font-medium shadow-sm flex items-center gap-2"
                      >
                        {service}
                        <span className="text-teal-700 font-bold bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg text-xs">
                          ₹{getFixedPrice(service)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {SERVICE_BUNDLES.map((bundle, index) => (
                    <div
                      key={index}
                      className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === index ? null : index)}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 font-bold text-slate-700">
                          {bundle.icon}
                          {bundle.title}
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            expanded === index ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {expanded === index && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden bg-slate-50/50"
                          >
                            <div className="p-6 grid md:grid-cols-2 gap-3">
                              {bundle.services.map((service) => (
                                <label
                                  key={service}
                                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-500 transition-all"
                                >
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-teal-600 rounded"
                                    checked={selectedServices.includes(service)}
                                    onChange={() =>
                                      setSelectedServices((prev) =>
                                        prev.includes(service)
                                          ? prev.filter((s) => s !== service)
                                          : [...prev, service]
                                      )
                                    }
                                  />
                                  <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    {service}
                                    <span className="text-teal-700 font-bold">₹{getFixedPrice(service)}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  <div className="mt-8 space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Add a specialized service..."
                        className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500"
                        value={customService}
                        onChange={(e) => setCustomService(e.target.value)}
                      />
                      <Plus className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={saveServices}
                        disabled={savingServices}
                        className="flex-1 py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                      >
                        {savingServices ? "Saving..." : "Save Services"}
                      </Button>

                      {hasSavedServices && (
                        <Button
                          type="button"
                          onClick={() => {
                            setIsEditingServices(false);
                            setCustomService("");
                          }}
                          className="flex-1 py-4 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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