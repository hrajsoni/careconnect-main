"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Home,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HeartHandshake,
  BadgeCheck,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";

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
  rejectionReason?: string;
  createdAt?: string;
  photo?: string;
};

type ToastState = {
  type: "success" | "error" | "";
  text: string;
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

export default function CareAssistantProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AssistantUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<ToastState>({ type: "", text: "" });

  const fetchProfile = async (showLoader = true) => {
    const userId = localStorage.getItem("userId");
    

    if (!userId) {
      router.push("/login");
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await fetchWithTimeout(`${API_BASE}/api/auth/user/${userId}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        // Prevents wiping unrelated app data (e.g. theme prefs) on session expiry
        ["token", "role", "userId"].forEach((k) => localStorage.removeItem(k));
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load profile");
      }

      const profile = data?.user || null;
      setUser(profile);

      // All profile fields (name, email, phone, location, photo) come from API state — not localStorage
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to load profile.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile(true);
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [message]);

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

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold mb-3">
                  <HeartHandshake className="w-4 h-4" />
                  Care Assistant Profile
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  My Profile
                </h1>
                <p className="text-slate-500 mt-2 max-w-2xl">
                  Review your account, verification status, and registered
                  support details.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => fetchProfile(false)}
                disabled={refreshing || loading}
                className="rounded-2xl !bg-teal-50 !border !border-teal-200 !text-teal-700 hover:!bg-teal-100"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </Button>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading profile...
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-teal-100 bg-slate-100">
                      <img
                        src={profilePhoto}
                        alt="Care assistant profile"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {user?.name || "Not available"}
                      </h2>
                      <p className="text-slate-500">
                        {user?.email || "Not available"}
                      </p>
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
                        Email
                      </div>
                      <p className="font-semibold text-slate-900 break-all">
                        {user?.email || "Not available"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <Phone className="w-4 h-4 text-teal-600" />
                        Phone
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
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Verification Summary
                  </h2>
                  <p className="text-slate-500 mt-1 mb-6">
                    Your platform approval and identity details.
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

                    {user?.rejectionReason && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                        <p className="text-sm font-semibold text-rose-700 mb-1">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-rose-600">
                          {user.rejectionReason}
                        </p>
                      </div>
                    )}

                    {user?.verificationStatus === "approved" && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-700 mb-1">
                          Approved Account
                        </p>
                        <p className="text-sm text-emerald-600">
                          Your care assistant account is approved and ready for
                          future support task assignment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
      </DashboardLayout>
    </AuthGuard>
  );
}
