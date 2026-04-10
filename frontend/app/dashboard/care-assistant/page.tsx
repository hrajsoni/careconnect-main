"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HeartHandshake,
  UserRound,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  Home,
  ClipboardList,
  ShieldCheck,
  Car,
  CalendarDays,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type AssistantUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  isApproved?: boolean;
  verificationStatus?: string;
  createdAt?: string;
  photo?: string;
};

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

export default function CareAssistantDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AssistantUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/user/${userId}`, { 
        credentials: "include" 
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load profile");
      }

      const profile = data?.user || null;
      setUser(profile);

      // Keep only role in localStorage — all profile fields come from API state (user)
      if (profile?.role) localStorage.setItem("role", profile.role);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return "Recently joined";
    return new Date(user.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [user?.createdAt]);

  const profilePhoto = useMemo(() => {
    if (user?.photo) {
      return `${API_BASE}/${user.photo.replace(/^\/+/, "")}`;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "Care Assistant"
    )}&background=0f766e&color=ffffff&size=256`;
  }, [user?.photo, user?.name]);

  const quickActions = [
    {
      title: "View Profile",
      description:
        "See your registered care assistant account information and approval details.",
      icon: <UserRound className="w-6 h-6" />,
      onClick: () => router.push("/dashboard/care-assistant/profile"),
      color: "from-teal-500 to-cyan-500",
    },
    {
      title: "Support Requests",
      description:
        "View and accept patient support requests for accompaniment and follow-up tasks.",
      icon: <Users className="w-6 h-6" />,
      onClick: () => router.push("/dashboard/care-assistant/requests"),
      color: "from-violet-500 to-indigo-500",
    },
    {
      title: "Transport Tasks",
      description:
        "Manage your accepted pickup, drop, and medical visit assistance tasks here.",
      icon: <Car className="w-6 h-6" />,
      onClick: () => router.push("/dashboard/care-assistant/transport"),
      color: "from-amber-500 to-orange-500",
    },
    {
      title: "Scheduled Assistance",
      description:
        "View your upcoming assigned visits, follow-ups, and active care coordination tasks.",
      icon: <CalendarDays className="w-6 h-6" />,
      onClick: () => router.push("/dashboard/care-assistant/requests"),
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-semibold mb-4">
                    <HeartHandshake className="w-4 h-4" />
                    Care Assistant Dashboard
                  </div>

                  <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                    Welcome, {user?.name || "Care Assistant"}
                  </h1>

                  <p className="mt-4 text-slate-200 max-w-2xl text-lg leading-relaxed">
                    Support patients through doctor visits, follow-up assistance,
                    pickup and drop coordination, and compassionate care
                    accompaniment.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[280px] backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.2em] text-teal-100 font-semibold">
                    Verification Status
                  </p>
                  <h3 className="text-2xl font-bold mt-3 capitalize">
                    {user?.verificationStatus || "Pending"}
                  </h3>
                  <p className="text-slate-200 text-sm mt-2 leading-relaxed">
                    Your account must be approved by admin before you can
                    actively handle care support requests.
                  </p>
                </div>
              </div>
            </motion.div>

            <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  My Information
                </h2>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                    Loading your profile...
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-teal-100 bg-slate-100">
                        <img
                          src={profilePhoto}
                          alt="Care assistant"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {user?.name || "Not available"}
                        </h3>
                        <p className="text-slate-500">{user?.email || "Not available"}</p>
                        <p className="text-sm text-teal-700 mt-1 font-medium capitalize">
                          {(user?.role || "care_assistant").replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <UserRound className="w-4 h-4 text-teal-600" />
                          Full Name
                        </div>
                        <p className="font-semibold text-slate-900">
                          {user?.name || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <Mail className="w-4 h-4 text-teal-600" />
                          Email Address
                        </div>
                        <p className="font-semibold text-slate-900 break-all">
                          {user?.email || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <Phone className="w-4 h-4 text-teal-600" />
                          Phone Number
                        </div>
                        <p className="font-semibold text-slate-900">
                          {user?.phone || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <MapPin className="w-4 h-4 text-teal-600" />
                          Location
                        </div>
                        <p className="font-semibold text-slate-900">
                          {user?.location || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">
                  Account Summary
                </h2>
                <p className="text-slate-500 mt-1 mb-6">
                  Basic account and verification details.
                </p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <BadgeCheck className="w-4 h-4 text-teal-600" />
                      Role
                    </div>
                    <p className="font-semibold text-slate-900 capitalize">
                      {(user?.role || "care_assistant").replace("_", " ")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Verification Status
                    </div>
                    <p className="font-semibold text-slate-900 capitalize">
                      {user?.verificationStatus || "Pending"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <Home className="w-4 h-4 text-teal-600" />
                      Member Since
                    </div>
                    <p className="font-semibold text-slate-900">
                      {memberSince}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <ClipboardList className="w-4 h-4 text-teal-600" />
                      Account ID
                    </div>
                    <p className="font-semibold text-slate-900 break-all text-sm">
                      {user?._id || user?.id || "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Quick Actions
                </h2>
                <p className="text-slate-500">
                  Access upcoming care assistant tools and task areas.
                </p>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {quickActions.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
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

                    <Button
                      type="button"
                      onClick={item.onClick}
                      className="mt-6 rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Open
                    </Button>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
