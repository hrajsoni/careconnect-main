"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

  throw new Error("Unexpected server response received.");
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRule =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (!passwordRule.test(password)) {
      setError(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 symbol."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to reset password");
      }

      setMessage(data?.message || "Password reset successfully");
      setTimeout(() => router.push("/login"), 1600);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Reset Password
            </h1>
            <p className="text-sm text-slate-500">
              Create a new secure password
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl mb-4 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-2xl mb-4 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-semibold"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Resetting..." : "Reset Password"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading reset form...
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
