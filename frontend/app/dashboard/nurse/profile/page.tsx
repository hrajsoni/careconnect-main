"use client";

import { useRouter } from 'next/navigation';

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRound,
  Phone,
  MapPin,
  GraduationCap,
  BriefcaseMedical,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  LocateFixed,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function NurseProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    qualification: "",
    experience: "",
    bio: "",
  });

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [geoLoading, setGeoLoading] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser." });
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
          setFormData((prev) => ({ ...prev, location: locationStr }));
        } catch {
          setMessage({ type: "error", text: "Could not resolve location. Please enter manually." });
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setMessage({ type: "error", text: "Location access denied. Please allow or enter manually." });
        } else {
          setMessage({ type: "error", text: "Unable to detect location. Please enter manually." });
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

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

        const responseData = await res.json();
        const data = responseData.data?.user || responseData.user || responseData;

        if (res.ok) {
          const fetchedNurseId =
            responseData?.data?.user?._id ||
            responseData?.user?._id ||
            responseData?.data?.user?.id ||
            responseData?.user?.id;

          if (!fetchedNurseId) {
            clearStoredAuth();
            router.push("/login");
            return;
          }

          setUserId(fetchedNurseId);
          setVerificationStatus(data.verificationStatus || null);
          setFormData({
            name: data.name || "",
            phone: data.phone || "",
            location: data.location || "",
            qualification: data.qualification || "",
            experience: data.experience ? String(data.experience) : "",
            bio: data.bio || "",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const saveProfile = async () => {
    setSaving(true);

    try {
      if (!userId) {
        setMessage({ type: "error", text: "User profile not loaded yet." });
        return;
      }

      const res = await fetchWithTimeout(`${API_BASE}/api/auth/update-nurse-profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          id: userId,
          ...formData,
          experience: formData.experience ? Number(formData.experience) : 0,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update profile.");
      }

      // Profile fields (name, phone, location) live in formData state — not localStorage

      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to update profile." });
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
              Professional Profile
            </h1>
            <p className="text-slate-500 mt-2">
              Keep your public and professional information up to date.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400">
              Loading profile...
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
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
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="City / Area"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="Qualification"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="relative">
                  <BriefcaseMedical className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    name="experience"
                    type="number"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Years of Experience"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Verification Status
                    </p>
                    <p className="text-lg font-bold text-slate-900 capitalize">
                      {verificationStatus || "Not submitted"}
                    </p>
                  </div>
                  <FileText className="w-6 h-6 text-teal-500" />
                </div>
              </div>

              <div className="mt-6">
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write a short professional introduction..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="mt-8">
                <Button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving Profile..." : "Save Profile"}
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