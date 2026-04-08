"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { clearStoredAuth, getStoredRole } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      setRole(getStoredRole());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetchWithTimeout(`${API_BASE}/api/auth/logout`, {
        method: "POST",
      });
    } catch {
      // Local cleanup still runs even if the request fails.
    } finally {
      clearStoredAuth();
      setRole(null);
      setLoggingOut(false);
      router.push("/login");
    }
  };

  const dashboardLink = useMemo(() => {
    if (role === "admin") return "/dashboard/admin";
    if (role === "nurse") return "/dashboard/nurse";
    if (role === "care_assistant") return "/dashboard/care-assistant";
    return "/dashboard/patient";
  }, [role]);

  const logoHref = mounted && role ? dashboardLink : "/";

  const isPublicHomePage = pathname === "/" && !role;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 h-20 flex items-center justify-between gap-6">
        <Link href={logoHref} className="flex items-center gap-3 group shrink-0">
          <div className="bg-teal-500 p-2.5 rounded-2xl group-hover:scale-105 transition">
            <HeartPulse className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Care<span className="text-teal-500">Connect</span>
          </span>
        </Link>

        {isPublicHomePage && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-teal-600 transition">
              Services
            </a>
            <a href="#how-it-works" className="hover:text-teal-600 transition">
              How It Works
            </a>
            <a href="#why-us" className="hover:text-teal-600 transition">
              Why CareConnect
            </a>
          </nav>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {mounted && role ? (
            <>
              <Link
                href={dashboardLink}
                className="hidden sm:inline-flex px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-white transition"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-5 py-2.5 rounded-full bg-teal-500 text-white font-semibold hover:bg-teal-600 shadow-md hover:shadow-lg transition"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-white transition"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-full bg-teal-500 text-white font-semibold hover:bg-teal-600 shadow-md hover:shadow-lg transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
