"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bed,
  Building2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Ambulance,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Info,
  Wifi,
  WifiOff,
  Star,
  ChevronRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ── Dummy hospitals data ────────────────────────────────────────────────────
const HOSPITALS = [
  {
    id: "h1",
    name: "Gwalior District Hospital",
    address: "City Centre Road, Lashkar, Gwalior, Madhya Pradesh",
    phone: "+91 751 242 2100",
    distance: "2.1 km",
    rating: 4.4,
    type: "Government",
    color: "from-blue-600 to-cyan-600",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "h2",
    name: "Apex Multi-Specialty Hospital",
    address: "Thatipur, Near Gwalior Fort Road, Gwalior, MP",
    phone: "+91 751 408 5000",
    distance: "3.6 km",
    rating: 4.7,
    type: "Private",
    color: "from-teal-600 to-emerald-600",
    bg: "bg-teal-50",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    id: "h3",
    name: "Sunrise Critical Care Centre",
    address: "Phoolbagh Colony, Morar, Gwalior, MP",
    phone: "+91 751 403 2200",
    distance: "5.4 km",
    rating: 4.2,
    type: "Private",
    color: "from-amber-600 to-orange-600",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    id: "h4",
    name: "Jay Arogya Group of Hospitals",
    address: "MLN Medical College Campus, Gole Ka Mandir, Gwalior, MP",
    phone: "+91 751 232 0800",
    distance: "6.8 km",
    rating: 4.0,
    type: "Government",
    color: "from-violet-600 to-purple-600",
    bg: "bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
  },
];

// Generates random but realistic bed availability for a hospital
function generateBeds(hospitalId: string, seed: number) {
  const rng = (n: number) => ((seed * 7 + n * 13) % 17) / 17;

  const icuTotal = hospitalId === "h1" ? 20 : hospitalId === "h2" ? 15 : hospitalId === "h3" ? 12 : 10;
  const genTotal = hospitalId === "h1" ? 60 : hospitalId === "h2" ? 45 : hospitalId === "h3" ? 30 : 40;
  const emgTotal = 8;

  const icuAvail = Math.max(0, Math.floor(icuTotal * (0.1 + rng(1) * 0.6)));
  const genAvail = Math.max(0, Math.floor(genTotal * (0.2 + rng(2) * 0.6)));
  const emgAvail = Math.max(0, Math.floor(emgTotal * (0.2 + rng(3) * 0.7)));

  return [
    { type: "ICU", total: icuTotal, available: icuAvail, icon: "🏥", color: icuAvail === 0 ? "red" : icuAvail <= 3 ? "amber" : "emerald" },
    { type: "General", total: genTotal, available: genAvail, icon: "🛏️", color: genAvail === 0 ? "red" : genAvail <= 8 ? "amber" : "emerald" },
    { type: "Emergency", total: emgTotal, available: emgAvail, icon: "🚨", color: emgAvail === 0 ? "red" : emgAvail <= 2 ? "amber" : "emerald" },
  ];
}

const bedColorMap: Record<string, string> = {
  red: "bg-red-50 border-red-200 text-red-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const bedBadgeMap: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

function HospitalSystemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId") || "";
  const patientIdParam = searchParams.get("patientId") || "";

  const [seed, setSeed] = useState(() => Date.now() % 1000);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [selectedBedType, setSelectedBedType] = useState<string>("");
  const [bookingStep, setBookingStep] = useState<"browse" | "confirm" | "success">("browse");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookedBedNumber, setBookedBedNumber] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate real-time updates every 8 seconds
  useEffect(() => {
    if (!isLive) return;
    intervalRef.current = setInterval(() => {
      setSeed((s) => (s + 37) % 1000);
      setLastUpdated(new Date());
    }, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive]);

  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleRefresh = () => {
    setSeed((s) => (s + 99) % 1000);
    setLastUpdated(new Date());
  };

  const handleSelectBed = (hospitalId: string, bedType: string) => {
    setSelectedHospital(hospitalId);
    setSelectedBedType(bedType);
    setBookingStep("confirm");
  };

  const handleConfirmBed = async () => {
    const hospital = HOSPITALS.find((h) => h.id === selectedHospital);
    if (!hospital || !selectedBedType) return;

    setSubmitting(true);
    try {
      const patientId = patientIdParam || localStorage.getItem("userId") || "";
      const bedNum = `${selectedBedType[0]}${Math.floor(Math.random() * 100) + 1}`;

      const res = await fetchWithTimeout(`${API_BASE}/api/ambulance/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          bookingId: bookingIdParam || undefined,
          pickupAddress: "Current Location (via Hospital System)",
          selectedHospital: hospital.name,
          hospitalId: hospital.id,
          bedBooked: true,
          bedNumber: bedNum,
          bedType: selectedBedType,
          condition: "critical",
          notes: `Bed ${bedNum} at ${hospital.name} booked via ICU System`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Booking failed");

      setBookedBedNumber(bedNum);
      setBookingStep("success");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to book bed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10 bg-gradient-to-br from-slate-50 via-white to-teal-50">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-100 text-sm font-bold mb-3">
                  <Ambulance className="w-4 h-4" />
                  Emergency Hospital System — DEMO
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Real-Time ICU Bed Availability
                </h1>
                <p className="text-slate-500 mt-1">
                  Browse nearby hospitals and book ICU / Emergency beds for critical patients.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${isLive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                  {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isLive ? "LIVE" : "PAUSED"}
                </div>
                <button
                  onClick={() => setIsLive((v) => !v)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {isLive ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Last updated */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              Last updated: {lastUpdated.toLocaleTimeString()} · Updates every 8 seconds
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Disclaimer */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Demo Mode:</strong> This is a simulated hospital system for showcase purposes. Bed availability
                data is randomly generated and refreshes every 8 seconds to simulate real-time updates. No actual
                hospital booking is made.
              </p>
            </div>

            {/* Main content */}
            <AnimatePresence mode="wait">
              {bookingStep === "browse" && (
                <motion.div key="browse" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid gap-6">
                    {HOSPITALS.map((hospital) => {
                      const beds = generateBeds(hospital.id, seed);
                      return (
                        <motion.div
                          key={hospital.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                          {/* Hospital header */}
                          <div className={`bg-gradient-to-r ${hospital.color} p-6 text-white`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                  <Building2 className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold">{hospital.name}</h2>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20`}>
                                      {hospital.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-white/80 text-sm">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {hospital.distance}</span>
                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {hospital.phone}</span>
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {hospital.rating}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-white/60 text-sm">{hospital.address}</div>
                            </div>
                          </div>

                          {/* Bed availability */}
                          <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                              Bed Availability
                            </h3>
                            <div className="grid sm:grid-cols-3 gap-4">
                              {beds.map((bed) => (
                                <div
                                  key={bed.type}
                                  className={`rounded-2xl border p-4 ${bedColorMap[bed.color]}`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{bed.icon}</span>
                                      <span className="font-bold text-sm">{bed.type}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bedBadgeMap[bed.color]}`}>
                                      {bed.available === 0 ? "Full" : bed.available <= 3 ? "Limited" : "Available"}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full rounded-full bg-white/60 h-2 mb-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-700 ${bed.color === "red" ? "bg-red-500" : bed.color === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
                                      style={{ width: `${(bed.available / bed.total) * 100}%` }}
                                    />
                                  </div>

                                  <p className="text-sm font-semibold">
                                    <span className="text-lg font-extrabold">{bed.available}</span>
                                    <span className="text-xs opacity-70"> / {bed.total} beds free</span>
                                  </p>

                                  {bed.available > 0 && (
                                    <button
                                      onClick={() => handleSelectBed(hospital.id, bed.type)}
                                      className="mt-3 w-full py-2 rounded-xl bg-white border border-current text-xs font-bold hover:opacity-80 transition flex items-center justify-center gap-1"
                                    >
                                      Book This Bed <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {bookingStep === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
                      <Bed className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Confirm Bed Booking</h2>
                    <p className="text-slate-500 text-center mb-6">
                      You are about to reserve a <strong>{selectedBedType}</strong> bed at{" "}
                      <strong>{HOSPITALS.find((h) => h.id === selectedHospital)?.name}</strong>.
                    </p>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6 flex gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      This is a demo. No actual booking is made in a real hospital system.
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setBookingStep("browse")}>
                        Back
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 text-white hover:bg-red-700"
                        onClick={handleConfirmBed}
                        disabled={submitting}
                      >
                        {submitting ? "Booking..." : "Confirm & Book Bed"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {bookingStep === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-10 max-w-xl mx-auto text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Bed Reserved!</h2>
                    <p className="text-slate-500 mb-6">
                      Bed <strong className="text-slate-800">{bookedBedNumber}</strong> ({selectedBedType}) at{" "}
                      <strong className="text-slate-800">{HOSPITALS.find((h) => h.id === selectedHospital)?.name}</strong>{" "}
                      has been reserved. Ambulance dispatch logged.
                    </p>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 mb-6 text-sm text-emerald-700">
                      <p>The ambulance request and bed reservation have been saved and will appear in the admin dashboard under Ambulance Requests.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/patient/bookings")}>
                        My Bookings
                      </Button>
                      <Button className="flex-1 bg-teal-600 text-white hover:bg-teal-700" onClick={() => setBookingStep("browse")}>
                        Browse More Hospitals
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Toast */}
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

export default function HospitalSystemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading hospital system...
      </div>
    }>
      <HospitalSystemContent />
    </Suspense>
  );
}
