"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 px-6">
      <div className="text-center">
        <div className="text-8xl font-bold text-teal-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-slate-500 mb-8">
          The page you are looking for does not exist.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
