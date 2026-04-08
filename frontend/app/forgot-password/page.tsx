"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to send reset link");
      }

      setMessage(
        data?.message ||
          "If an account with that email exists, a reset link has been sent."
      );
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
              Forgot Password
            </h1>
            <p className="text-sm text-slate-500">
              We’ll email you a reset link
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
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-semibold"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Sending..." : "Send Reset Link"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Remembered your password?{" "}
          <span
            onClick={() => router.push("/login")}
            className="text-teal-600 font-semibold cursor-pointer hover:underline"
          >
            Back to login
          </span>
        </div>
      </motion.div>
    </div>
  );
}
