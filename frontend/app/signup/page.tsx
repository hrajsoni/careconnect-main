"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldPlus,
  UserRound,
  Stethoscope,
  Mail,
  Lock,
  Phone,
  MapPin,
  ArrowRight,
  Camera,
  HeartHandshake,
  FileText,
  LocateFixed,
  Loader2,
} from "lucide-react";
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
    throw new Error("Unexpected server response received.");
  }
}

type RoleType = "patient" | "nurse" | "care_assistant";

export default function SignupPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    role: "patient" as RoleType,
    qualification: "",
    experience: "",
    registrationNumber: "",
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [dbServices, setDbServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const passwordRule =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (token && role) {
        if (role === "admin") {
          router.replace("/dashboard/admin");
          return;
        }
        if (role === "nurse") {
          router.replace("/dashboard/nurse");
          return;
        }
        if (role === "care_assistant") {
          router.replace("/dashboard/care-assistant");
          return;
        }
        router.replace("/dashboard/patient");
        return;
      }

      setCheckingAuth(false);
    };

    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services`);
        const data = await res.json();
        if (data.success && data.data) {
          setDbServices(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch services", err);
      }
    };

    checkAuth();
    fetchServices();
  }, [router]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        phone: digitsOnly,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (role: RoleType) => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setError("");
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
            address.city ||
            address.town ||
            address.village ||
            address.county ||
            address.state_district ||
            "";
          const state = address.state || "";
          const locationStr = city && state ? `${city}, ${state}` : city || state || data?.display_name || "";
          setFormData((prev) => ({ ...prev, location: locationStr }));
        } catch {
          setError("Could not determine your location. Please enter it manually.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please allow access or enter manually.");
        } else {
          setError("Unable to detect location. Please enter it manually.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG and PNG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5MB or less.");
      return;
    }

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!passwordRule.test(formData.password)) {
      setError(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 symbol."
      );
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("email", formData.email.trim());
      payload.append("password", formData.password);
      payload.append("phone", formData.phone.trim());
      payload.append("location", formData.location.trim());
      payload.append("role", formData.role);

      if (formData.role === "care_assistant" || formData.role === "nurse") {
        payload.append("qualification", formData.qualification.trim());
        payload.append("experience", formData.experience);
        payload.append(
          "registrationNumber",
          formData.registrationNumber.trim()
        );
        if (formData.role === "nurse" && selectedServices.length > 0) {
          payload.append("services", JSON.stringify(selectedServices));
          const pricesMap: Record<string, number> = {};
          selectedServices.forEach(id => {
            const svc = dbServices.find(s => s._id === id);
            if (svc) pricesMap[id] = svc.price;
          });
          payload.append("servicePrices", JSON.stringify(pricesMap));
        }
      }

      if (selectedPhoto) {
        payload.append("photo", selectedPhoto);
      }

      // Signup does not need credentials:"include" since it
      // doesn't set or read any auth cookie — just creates account
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        body: payload,
      });

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Signup failed");
      }

      if (formData.role === "nurse" || formData.role === "care_assistant") {
        setSuccess(
          "Account created successfully! Please log in and complete verification."
        );
      } else {
        setSuccess("Account created successfully! Redirecting to login...");
      }

      setTimeout(() => router.push("/login"), 1600);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordValid = passwordRule.test(formData.password);

  const roleNote = useMemo(() => {
    if (formData.role === "nurse") {
      return "Nurses will need to complete document verification after signup before offering services on the platform.";
    }
    if (formData.role === "care_assistant") {
      return "Care assistants will need admin approval before handling patient accompaniment and follow-up support services.";
    }
    return "Patients can create an account and begin exploring services right away.";
  }, [formData.role]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 left-10 w-72 h-72 rounded-full bg-teal-200/25 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-cyan-200/25 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-2xl backdrop-blur-xl bg-white/85 border border-white/70 shadow-2xl rounded-[2rem] p-8 md:p-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg">
            <ShieldPlus size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Care<span className="text-teal-500">Connect</span>
            </h1>
            <p className="text-sm text-slate-500">Trusted care begins here</p>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Create Your Account
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Join CareConnect as a patient, nurse, or care assistant and access a
          trusted healthcare support platform built for home care and real
          family needs.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-2xl mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Register As</p>

            <div className="grid md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleRoleChange("patient")}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  formData.role === "patient"
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.role === "patient"
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <UserRound size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800">Patient</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Book healthcare services and manage care needs.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("nurse")}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  formData.role === "nurse"
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.role === "nurse"
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Stethoscope size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800">Nurse</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Join as a provider and offer verified healthcare services.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("care_assistant")}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  formData.role === "care_assistant"
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.role === "care_assistant"
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <HeartHandshake size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800">Care Assistant</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Help patients with visits, follow-ups, pickup and drop
                  support.
                </p>
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              {roleNote}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Profile Photo
            </label>

            <div className="gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                <Image
                  src={photoPreview || "/placeholder-user.png"}
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

          <div className="relative">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <div className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                +91
              </div>
              <input
                type="text"
                name="phone"
                placeholder="10 digit number"
                value={formData.phone}
                onChange={handleChange}
                required
                maxLength={10}
                inputMode="numeric"
                className="w-full pl-24 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
              />
            </div>

            <div className="relative">
              <input
                type="text"
                name="location"
                placeholder="City / Area"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-36 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
              />
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition disabled:opacity-60"
              >
                {geoLoading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Locating...</>
                ) : (
                  <><LocateFixed className="w-3 h-3" /> Use GPS</>
                )}
              </button>
            </div>
          </div>

          {(formData.role === "care_assistant" ||
            formData.role === "nurse") && (
            <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900 mb-4">
                Professional Information
              </p>

              <div className="relative">
                <input
                  type="text"
                  name="qualification"
                  placeholder="Qualification (e.g., B.Sc Nursing, Diploma in Caregiving)"
                  value={formData.qualification}
                  onChange={handleChange}
                  required={
                    formData.role === "care_assistant" ||
                    formData.role === "nurse"
                  }
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
                />
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              </div>

              <div className="relative">
                <input
                  type="number"
                  name="experience"
                  placeholder="Years of Experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required={
                    formData.role === "care_assistant" ||
                    formData.role === "nurse"
                  }
                  min="0"
                  max="70"
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
                />
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="registrationNumber"
                  placeholder="Registration/License Number"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  required={
                    formData.role === "care_assistant" ||
                    formData.role === "nurse"
                  }
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
                />
                <ShieldPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              </div>
            </div>
          )}

          {formData.role === "nurse" && dbServices.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50 p-5">
              <p className="text-sm font-semibold text-teal-900 mb-2">Select Services You Provide & See Pricing</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {dbServices.map(service => (
                  <label key={service._id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedServices.includes(service._id) ? 'border-teal-500 bg-white shadow-sm' : 'border-transparent hover:bg-teal-100/50'}`}>
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      checked={selectedServices.includes(service._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServices(prev => [...prev, service._id]);
                        } else {
                          setSelectedServices(prev => prev.filter(id => id !== service._id));
                        }
                      }}
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{service.name}</div>
                      <div className="text-xs text-teal-700 font-bold mt-1">₹{service.price}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type="password"
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Lock className="absolute left-4 top-6 text-slate-400 w-5 h-5" />
          </div>

          <div className="space-y-2">
            {/* Password strength indicator */}
            {formData.password && (() => {
              const pw = formData.password;
              const hasUpper = /[A-Z]/.test(pw);
              const hasLower = /[a-z]/.test(pw);
              const hasNum   = /[0-9]/.test(pw);
              const hasSym   = /[^A-Za-z0-9]/.test(pw);
              const isStrong = pw.length >= 8 && hasUpper && hasLower && hasNum && hasSym;
              const isMedium = pw.length >= 8 && !isStrong;
              const isWeak   = pw.length < 8;

              const label = isStrong ? "Strong" : isMedium ? "Medium" : "Weak";
              const color  = isStrong
                ? { bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-500" }
                : isMedium
                ? { bar: "bg-orange-400",  text: "text-orange-500",  bg: "bg-orange-400" }
                : { bar: "bg-red-500",     text: "text-red-500",     bg: "bg-red-500" };
              const width = isStrong ? "w-full" : isMedium ? "w-2/3" : "w-1/3";

              return (
                <div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${color.bar} ${width}`}
                    />
                  </div>
                  <p className={`text-xs font-semibold mt-1 ${color.text}`}>
                    {label} password
                  </p>
                </div>
              );
            })()}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700 mb-2">
                Password must include:
              </p>
              <ul className="space-y-1 text-slate-600">
                <li>• Minimum 8 characters</li>
                <li>• At least 1 uppercase letter</li>
                <li>• At least 1 lowercase letter</li>
                <li>• At least 1 number</li>
                <li>• At least 1 special symbol</li>
              </ul>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-70"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Creating Account..." : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <span
            onClick={() => router.push("/login")}
            className="text-teal-600 font-semibold cursor-pointer hover:underline"
          >
            Login
          </span>
        </div>
      </motion.div>
    </div>
  );
}
