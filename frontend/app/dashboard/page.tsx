"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { motion } from "framer-motion";
import {
  CalendarDays,
  FileUp,
  MapPin,
  HeartHandshake,
  Clock3,
  ArrowRight,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { clearStoredAuth } from "@/utils/session";

export default function PatientDashboard() {
  const router = useRouter();
  const [name, setName] = useState("Patient");
  const [location, setLocation] = useState("");

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });

        if (res.status === 401) {
          clearStoredAuth();
          router.push("/login");
          return;
        }

        const data = await safeParseResponse(res);
        if (!res.ok) return;

        const user = data?.data?.user ?? data?.user;
        if (user?.name) setName(user.name);
        if (user?.location) setLocation(user.location);
      } catch {
        // Keep dashboard render even if profile metadata fails to load
      }
    };

    loadProfile();
  }, [API_BASE, router]);

  const quickActions = [
    {
      title: "Find Nearby Nurses",
      description:
        "Browse verified nurses in your area based on service needs and availability.",
      icon: <MapPin className="w-6 h-6" />,
      action: () => router.push("/nurses"),
      color: "from-teal-500 to-cyan-500",
    },
    {
      title: "Upload Medical Reports",
      description:
        "Store and manage medical reports for smoother consultations and better care support.",
      icon: <FileUp className="w-6 h-6" />,
      action: () => router.push("/dashboard/patient/reports"),
      color: "from-violet-500 to-indigo-500",
    },
    {
      title: "View My Bookings",
      description:
        "Check upcoming appointments, booking history, and follow-up care requests.",
      icon: <CalendarDays className="w-6 h-6" />,
      action: () => router.push("/dashboard/patient/bookings"),
      color: "from-amber-500 to-orange-500",
    },
  ];

  const infoCards = [
    {
      title: "Verified Professionals",
      description:
        "CareConnect only lists healthcare providers after document review and approval.",
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      title: "Care at Your Doorstep",
      description:
        "Book home nursing, elderly care, and patient support services without hassle.",
      icon: <HeartHandshake className="w-5 h-5" />,
    },
    {
      title: "Faster Access Nearby",
      description:
        "Location-based matching helps you find relevant care providers more quickly.",
      icon: <Clock3 className="w-5 h-5" />,
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-semibold mb-4">
                    <UserRound className="w-4 h-4" />
                    Patient Dashboard
                  </div>

                  <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                    Welcome back, {name}
                  </h1>

                  <p className="mt-4 text-slate-200 max-w-2xl text-lg leading-relaxed">
                    Manage your care journey, find trusted nurses, upload
                    medical reports, and keep your appointments organized — all
                    in one place.
                  </p>

                  {location && (
                    <div className="mt-5 inline-flex items-center gap-2 text-sm text-teal-100">
                      <MapPin className="w-4 h-4" />
                      Your location: {location}
                    </div>
                  )}
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[260px] backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.2em] text-teal-100 font-semibold">
                    Quick Tip
                  </p>
                  <h3 className="text-xl font-bold mt-3">
                    Need urgent home care?
                  </h3>
                  <p className="text-slate-200 text-sm mt-2 leading-relaxed">
                    Use location-based discovery to find the nearest verified
                    nurse for fast support.
                  </p>
                  <Button
                    type="button"
                    onClick={() => router.push("/nurses")}
                    className="mt-5 w-full bg-white text-slate-900 hover:bg-slate-100"
                  >
                    Explore Nurses
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Quick Actions
                </h2>
                <p className="text-slate-500">
                  Access your most important care tasks instantly.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {quickActions.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -6 }}
                    className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-xl transition"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-lg mb-5`}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed text-sm">
                      {item.description}
                    </p>

                    <button
                      onClick={item.action}
                      className="mt-6 inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition"
                    >
                      Open
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Info Cards */}
            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Why patients choose CareConnect
                </h2>
                <p className="text-slate-500">
                  Built around trust, convenience, and healthcare-specific
                  needs.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {infoCards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.1 }}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                      {card.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {card.title}
                    </h3>
                    <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Placeholder summary area */}
            <section className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  Upcoming Bookings
                </h3>
                <p className="text-slate-500 mt-2 text-sm">
                  Your scheduled appointments will appear here once booking is
                  enabled.
                </p>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400 text-sm">
                  No bookings to display yet.
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  Medical Reports
                </h3>
                <p className="text-slate-500 mt-2 text-sm">
                  Your uploaded reports and health notes will be available here.
                </p>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400 text-sm">
                  No medical reports uploaded yet.
                </div>
              </div>
            </section>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
