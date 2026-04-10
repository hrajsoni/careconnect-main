"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
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

export default function LoginPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (token && role) {
        if (role === "admin") {
          router.replace("/dashboard/admin");
        } else if (role === "nurse") {
          router.replace("/dashboard/nurse");
        } else if (role === "care_assistant") {
          router.replace("/dashboard/care-assistant");
        } else {
          router.replace("/dashboard/patient");
        }
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Login failed");
      }

      const payload = data.data ?? data;

      // Save to localStorage — no cookies
      localStorage.setItem("token", payload.token || "");
      localStorage.setItem("role", payload.role || "");
      localStorage.setItem(
        "userId",
        payload.user?.id ?? payload.user?._id ?? ""
      );

      if (payload.role === "admin") {
        router.push("/dashboard/admin");
      } else if (payload.role === "nurse") {
        router.push("/dashboard/nurse");
      } else if (payload.role === "care_assistant") {
        router.push("/dashboard/care-assistant");
      } else {
        router.push("/dashboard/patient");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to login";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/85 border border-white/70 shadow-2xl rounded-[2rem] p-8 md:p-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Care<span className="text-teal-500">Connect</span>
            </h1>
            <p className="text-sm text-slate-500">
              Secure access to your care dashboard
            </p>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Login to manage your bookings, verification, and care services.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="w-full pl-12 pr-12 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-teal-600 font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-70"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Signing In..." : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <span
            onClick={() => router.push("/signup")}
            className="text-teal-600 font-semibold cursor-pointer hover:underline"
          >
            Create Account
          </span>
        </div>
      </motion.div>
    </div>
  );
}
