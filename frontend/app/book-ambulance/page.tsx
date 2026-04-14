"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ambulance,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Phone,
  LocateFixed,
  Loader2,
  Activity,
  Building2,
  Bed,
} from "lucide-react";
import Button from "@/components/ui/Button";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function BookAmbulanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId") || "";
  const patientIdParam = searchParams.get("patientId") || "";

  const [form, setForm] = useState({
    pickupAddress: "",
    condition: "critical",
    notes: "",
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [dispatched, setDispatched] = useState<any>(null);

  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ type: "", text: "" }), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation not supported by your browser." });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data?.address || {};
          const parts = [
            a.house_number,
            a.road || a.pedestrian || a.footway,
            a.neighbourhood || a.suburb || a.quarter,
            a.city || a.town || a.village || a.county,
            a.state_district,
            a.state,
            a.postcode,
          ].filter(Boolean);
          const loc = parts.length >= 2 ? parts.join(", ") : (data?.display_name || "");
          setForm((prev) => ({ ...prev, pickupAddress: loc }));
        } catch {
          setMessage({ type: "error", text: "Could not resolve location." });
        } finally { setGeoLoading(false); }
      },
      (err) => {
        setGeoLoading(false);
        setMessage({ type: "error", text: err.code === err.PERMISSION_DENIED ? "Location access denied." : "Unable to detect location." });
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!form.pickupAddress.trim()) {
      setMessage({ type: "error", text: "Please enter your pickup address." });
      return;
    }

    const patientId = patientIdParam || localStorage.getItem("userId") || "";
    if (!patientId) {
      clearStoredAuth();
      router.push("/login");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/ambulance/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          bookingId: bookingIdParam || undefined,
          pickupAddress: form.pickupAddress,
          condition: form.condition,
          notes: form.notes,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed");

      setDispatched(data.data);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to dispatch ambulance." });
    } finally {
      setSubmitting(false);
    }
  };

  if (dispatched) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-emerald-200 shadow-2xl p-10 max-w-lg w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <Ambulance className="w-10 h-10 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Ambulance Dispatched!</h1>
              <p className="text-slate-500 mb-6">
                Help is on the way. Please stay calm and keep your phone accessible.
              </p>

              {/* Dummy dispatch details */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-left space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Ambulance className="w-4 h-4 text-red-500" />
                  <span className="font-bold">Vehicle:</span> {dispatched.ambulanceNumber || "MH-01-AB-1234"}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-teal-500" />
                  <span className="font-bold">Driver:</span> {dispatched.driverName} · {dispatched.driverPhone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span className="font-bold">ETA:</span> {dispatched.estimatedArrival} minutes
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="font-bold">Pickup:</span> {dispatched.pickupAddress}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 mb-6 text-sm text-blue-700">
                💡 You can also book an ICU bed at a nearby hospital using our Hospital System.
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/dashboard/patient/bookings")}
                >
                  My Bookings
                </Button>
                <Button
                  className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                  onClick={() =>
                    router.push(
                      `/hospital-system?bookingId=${bookingIdParam}&patientId=${patientIdParam || localStorage.getItem("userId") || ""}`
                    )
                  }
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Book ICU Bed
                </Button>
              </div>
            </motion.div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-xl mx-auto space-y-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center">
                  <Ambulance className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">Book Ambulance</h1>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Emergency dispatch · Demo system
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 mb-6 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                This is a demo ambulance dispatch system. For real emergencies please call 108.
              </div>

              <div className="space-y-4">
                {/* Pickup address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Pickup Address
                    </label>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={geoLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition disabled:opacity-60"
                    >
                      {geoLoading ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Detecting...</>
                      ) : (
                        <><LocateFixed className="w-3 h-3" /> Use Current Location</>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={form.pickupAddress}
                      onChange={(e) => setForm((p) => ({ ...p, pickupAddress: e.target.value }))}
                      placeholder="Enter pickup address / current location"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Patient Condition
                  </label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <select
                      value={form.condition}
                      onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                    >
                      <option value="critical">Critical — Immediate response needed</option>
                      <option value="serious">Serious — Urgent but stable</option>
                      <option value="stable">Stable — Non-emergency transport</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes, symptoms, access instructions..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-bold text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2 inline" /> Dispatching...</>
                  ) : (
                    <><Ambulance className="w-5 h-5 mr-2 inline" /> Dispatch Ambulance</>
                  )}
                </Button>

                <button
                  onClick={() =>
                    router.push(
                      `/hospital-system?bookingId=${bookingIdParam}&patientId=${patientIdParam || localStorage.getItem("userId") || ""}`
                    )
                  }
                  className="w-full py-4 rounded-2xl border border-teal-200 text-teal-700 hover:bg-teal-50 font-semibold transition flex items-center justify-center gap-2"
                >
                  <Bed className="w-5 h-5" />
                  Browse Hospitals & Book ICU Bed
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white font-bold flex items-center gap-2 z-50 ${message.type === "success" ? "bg-teal-600" : "bg-red-500"}`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </AuthGuard>
  );
}

export default function BookAmbulancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    }>
      <BookAmbulanceContent />
    </Suspense>
  );
}
