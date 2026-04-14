"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  CalendarDays,
  FileUp,
  MapPin,
  HeartHandshake,
  Clock3,
  ArrowRight,
  ShieldCheck,
  UserRound,
  Mail,
  Phone,
  BadgeCheck,
  RefreshCw,
  CreditCard,
  ClipboardList,
  Home,
  PencilLine,
  CheckCircle2,
  AlertCircle,
  Camera,
  LocateFixed,
  Loader2,
  Ambulance,
  Building2,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/Modal";
import { useRouter } from "next/navigation";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const DEFAULT_AVATAR = "/placeholder-user.png";

type PatientUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  isApproved?: boolean;
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
    return {
      success: false,
      message: "Unexpected server response received.",
      raw: rawText,
    };
  }
}

// ============================================================
// FIXED: Centralized 401 handler
// Selective removal + router.push instead of
// localStorage.clear() + window.location.href
// ============================================================
const handleUnauthorized = (router: ReturnType<typeof useRouter>) => {
  clearStoredAuth();
  router.push("/login");
};

export default function PatientDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<PatientUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<ToastState>({ type: "", text: "" });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    location: "",
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  // ============================================================
  // FIXED: Removed PII from localStorage reads
  // email, phone, photo are PII — should not be in localStorage
  // These values now come exclusively from the user state
  // (populated via /me or /user/:id API call)
  // Kept: userId, role — non-sensitive UI helpers
  // ============================================================
  const storedUserId =
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";
  const storedRole =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

  const displayName = user?.name || "Patient";
  const displayLocation = user?.location || "";
  const displayEmail = user?.email || "Not available";
  const displayPhone = user?.phone ? `+91 ${user.phone}` : "Not available";
  const displayRole = user?.role || storedRole || "patient";

  const profilePhotoUrl = useMemo(() => {
    // Photo comes from server state only — not localStorage
    const rawPhoto = user?.photo || "";
    if (!rawPhoto) return DEFAULT_AVATAR;

    if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
      return rawPhoto;
    }

    return `${API_BASE}/${rawPhoto.replace(/^\/+/, "")}`;
  }, [user?.photo]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return "Recently joined";
    return new Date(user.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [user?.createdAt]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  // ============================================================
  // FIXED: Removed PII from localStorage sync
  // Previously: stored email, phone, photo, location in localStorage
  // Now: only syncs name, role, userId — non-sensitive UI values
  // All sensitive data lives in server state (user) only
  // ============================================================
  const syncUserToStorage = (profile: PatientUser | null) => {
    if (!profile) return;
    // Keep only role + userId in localStorage — name is PII, comes from API state
    if (profile.role) localStorage.setItem("role", profile.role);
    if (profile._id) localStorage.setItem("userId", profile._id);
  };

  const fetchProfile = async (showLoader = true) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setUser(null);
      setLoadingProfile(false);
      return;
    }

    try {
      if (showLoader) {
        setLoadingProfile(true);
      } else {
        setRefreshingProfile(true);
      }

      // ============================================================
      // FIXED: Removed localStorage.getItem("token") check
      // Cookie sent automatically via credentials:"include"
      // If session expired, server returns 401 handled below
      // ============================================================
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/user/${userId}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch profile");
      }

      const profile = data?.user || data || null;
      setUser(profile);
      syncUserToStorage(profile);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Unable to load profile.";
      showMessage("error", msg);
    } finally {
      setLoadingProfile(false);
      setRefreshingProfile(false);
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

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const openEditModal = () => {
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || "",
      location: user?.location || "",
    });
    setSelectedPhoto(null);
    setPhotoPreview(user?.photo ? profilePhotoUrl : "");
    setEditOpen(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showMessage("error", "Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const address = data?.address || {};
          const city =
            address.city || address.town || address.village ||
            address.county || address.state_district || "";
          const state = address.state || "";
          const locationStr = city && state ? `${city}, ${state}` : city || state || data?.display_name || "";
          setEditForm((prev) => ({ ...prev, location: locationStr }));
        } catch {
          showMessage("error", "Could not resolve location. Please enter manually.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          showMessage("error", "Location access denied. Please allow or enter manually.");
        } else {
          showMessage("error", "Unable to detect location. Please enter manually.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setEditForm((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      showMessage("error", "Only JPG and PNG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image size must be 5MB or less.");
      return;
    }

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    const userId = user?._id || user?.id || localStorage.getItem("userId");

    if (!userId) {
      showMessage("error", "User not found.");
      return;
    }

    if (!editForm.name.trim()) {
      showMessage("error", "Name is required.");
      return;
    }

    if (editForm.phone && editForm.phone.length !== 10) {
      showMessage("error", "Phone number must be exactly 10 digits.");
      return;
    }

    if (!editForm.location.trim()) {
      showMessage("error", "Location is required.");
      return;
    }

    try {
      setSavingProfile(true);

      const formData = new FormData();
      formData.append("id", userId);
      formData.append("name", editForm.name.trim());
      formData.append("phone", editForm.phone.trim());
      formData.append("location", editForm.location.trim());

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      // ============================================================
      // FIXED: Removed Authorization header + token check
      // Cookie sent automatically via credentials:"include"
      // Do NOT set Content-Type for FormData — browser sets it
      // ============================================================
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/update-patient-profile`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (res.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update profile.");
      }

      const updatedUser = data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        syncUserToStorage(updatedUser);
      }

      setEditOpen(false);
      setSelectedPhoto(null);
      showMessage("success", data?.message || "Profile updated successfully.");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Unable to update profile.";
      showMessage("error", msg);
    } finally {
      setSavingProfile(false);
    }
  };

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
      title: "Request Care Assistant",
      description:
        "Get help for doctor visits, follow-up support, pickup and drop assistance, and general accompaniment.",
      icon: <HeartHandshake className="w-6 h-6" />,
      action: () =>
        router.push("/dashboard/patient/care-assistant-requests"),
      color: "from-pink-500 to-rose-500",
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
    {
      title: "Payment Records",
      description:
        "Track pending payments, completed transactions, and booking-linked payment details.",
      icon: <CreditCard className="w-6 h-6" />,
      action: () => router.push("/dashboard/patient/payments"),
      color: "from-emerald-500 to-teal-500",
    },
    {
      title: "Book Ambulance",
      description:
        "Critical situation? Dispatch an ambulance immediately and book ICU bed at a nearby hospital.",
      icon: <Ambulance className="w-6 h-6" />,
      action: () => router.push("/book-ambulance"),
      color: "from-red-500 to-rose-600",
    },
    {
      title: "Hospital ICU System",
      description:
        "Browse real-time ICU and emergency bed availability at nearby hospitals for critical patients.",
      icon: <Building2 className="w-6 h-6" />,
      action: () => router.push("/hospital-system"),
      color: "from-orange-500 to-amber-500",
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
                    Welcome back, {displayName}
                  </h1>

                  <p className="mt-4 text-slate-200 max-w-2xl text-lg leading-relaxed">
                    Manage your care journey, find trusted nurses, upload
                    medical reports, track payments, and keep your appointments
                    organized — all in one place.
                  </p>

                  {displayLocation && (
                    <div className="mt-5 inline-flex items-center gap-2 text-sm text-teal-100">
                      <MapPin className="w-4 h-4" />
                      Your location: {displayLocation}
                    </div>
                  )}
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[260px] backdrop-blur-sm w-full lg:w-auto">
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
                  <button
                    type="button"
                    onClick={() => router.push("/nurses")}
                    className="mt-5 w-full px-4 py-3 rounded-xl bg-teal-500 text-white hover:bg-teal-400 font-semibold transition"
                  >
                    Explore Nurses
                  </button>
                </div>
              </div>
            </motion.div>

            <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      My Information
                    </h2>
                    <p className="text-slate-500 mt-1">
                      View and manage your patient account details.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => fetchProfile(false)}
                      disabled={loadingProfile || refreshingProfile}
                      className="rounded-2xl px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 font-semibold transition disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw
                          className={`w-4 h-4 ${
                            refreshingProfile ? "animate-spin" : ""
                          }`}
                        />
                        {refreshingProfile ? "Refreshing..." : "Refresh"}
                      </span>
                    </button>

                    <Button
                      type="button"
                      onClick={openEditModal}
                      className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                    >
                      <span className="inline-flex items-center gap-2">
                        <PencilLine className="w-4 h-4" />
                        Edit Profile
                      </span>
                    </Button>
                  </div>
                </div>

                {loadingProfile ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                    Loading your profile...
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-teal-100 bg-slate-100">
                        <Image
                          src={profilePhotoUrl || DEFAULT_AVATAR}
                          alt="Patient profile"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {displayName}
                        </h3>
                        <p className="text-slate-500">{displayEmail}</p>
                        <p className="text-sm text-teal-700 mt-1 font-medium capitalize">
                          {displayRole}
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
                          {displayName}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <Mail className="w-4 h-4 text-teal-600" />
                          Email Address
                        </div>
                        <p className="font-semibold text-slate-900 break-all">
                          {displayEmail}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <Phone className="w-4 h-4 text-teal-600" />
                          Phone Number
                        </div>
                        <p className="font-semibold text-slate-900">
                          {displayPhone}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                          <MapPin className="w-4 h-4 text-teal-600" />
                          Location
                        </div>
                        <p className="font-semibold text-slate-900">
                          {displayLocation || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <h2 className="text-2xl font-bold text-slate-900">
                  Account Summary
                </h2>
                <p className="text-slate-500 mt-1 mb-6">
                  Basic account and platform details.
                </p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <BadgeCheck className="w-4 h-4 text-teal-600" />
                      Role
                    </div>
                    <p className="font-semibold text-slate-900 capitalize">
                      {displayRole.replace("_", " ")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <Home className="w-4 h-4 text-teal-600" />
                      Member Since
                    </div>
                    <p className="font-semibold text-slate-900">{memberSince}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <ClipboardList className="w-4 h-4 text-teal-600" />
                      Account ID
                    </div>
                    <p className="font-semibold text-slate-900 break-all text-sm">
                      {user?._id || user?.id || storedUserId || "Not available"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                    <p className="text-sm font-semibold text-teal-800 mb-1">
                      Profile management enabled
                    </p>
                    <p className="text-sm text-teal-700 leading-relaxed">
                      You can now keep your personal details updated for a
                      smoother booking and care experience.
                    </p>
                  </div>
                </div>
              </motion.div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Quick Actions
                </h2>
                <p className="text-slate-500">
                  Access your most important care tasks instantly.
                </p>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
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

            <section className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  Upcoming Bookings
                </h3>
                <p className="text-slate-500 mt-2 text-sm">
                  Your scheduled appointments will appear here once booking
                  activity is available.
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

        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
          <div className="pt-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Edit Profile
            </h2>
            <p className="text-slate-500 mb-6">
              Update your personal details for a smoother booking experience.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Profile Photo
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                    <Image
                      src={photoPreview || profilePhotoUrl || DEFAULT_AVATAR}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition">
                    <Camera className="w-4 h-4 text-teal-600" />
                    Choose Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Enter full name"
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                    +91
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    placeholder="10 digit number"
                    maxLength={10}
                    inputMode="numeric"
                    className="w-full pl-16 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Location
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
                  <input
                    type="text"
                    name="location"
                    value={editForm.location}
                    onChange={handleEditChange}
                    placeholder="City / Area"
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>

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
      </DashboardLayout>
    </AuthGuard>
  );
}
