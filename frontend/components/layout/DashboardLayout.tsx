"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  ClipboardList,
  IndianRupee,
  FileText,
  CreditCard,
  HeartHandshake,
  Car,
  Ambulance,
  Building2,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
    setMounted(true);
  }, [pathname]);

  const allMenuItems = useMemo(
    () => [
      {
        label: "Admin Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard/admin",
        role: "admin",
      },
      {
        label: "Services Content",
        icon: FileText,
        path: "/dashboard/admin/services",
        role: "admin",
      },
      {
        label: "Doctors Content",
        icon: UserCheck,
        path: "/dashboard/admin/doctors",
        role: "admin",
      },
      {
        label: "Admin Bookings",
        icon: ClipboardList,
        path: "/dashboard/admin/bookings",
        role: "admin",
      },
      {
        label: "Admin Payments",
        icon: CreditCard,
        path: "/dashboard/admin/payments",
        role: "admin",
      },
      {
        label: "Patient Records",
        icon: Users,
        path: "/dashboard/admin/patients",
        role: "admin",
      },
      {
        label: "Nurse Records",
        icon: UserCheck,
        path: "/dashboard/admin/nurses?status=all",
        role: "admin",
      },
      {
        label: "Care Assistant Records",
        icon: HeartHandshake,
        path: "/dashboard/admin/care-assistants?status=all",
        role: "admin",
      },
      {
        label: "Care Assistant Requests",
        icon: ClipboardList,
        path: "/dashboard/admin/care-assistant-requests",
        role: "admin",
      },
      {
        label: "Ambulance Requests",
        icon: Ambulance,
        path: "/dashboard/admin/ambulance",
        role: "admin",
      },
      {
        label: "Nurse Dashboard",
        icon: UserCheck,
        path: "/dashboard/nurse",
        role: "nurse",
      },
      {
        label: "My Services",
        icon: ClipboardList,
        path: "/dashboard/nurse/services",
        role: "nurse",
      },
      {
        label: "Pricing",
        icon: IndianRupee,
        path: "/dashboard/nurse/pricing",
        role: "nurse",
      },
      {
        label: "Profile",
        icon: Settings,
        path: "/dashboard/nurse/profile",
        role: "nurse",
      },
      {
        label: "My Bookings",
        icon: ClipboardList,
        path: "/dashboard/nurse/bookings",
        role: "nurse",
      },
      {
        label: "Payments",
        icon: CreditCard,
        path: "/dashboard/nurse/payments",
        role: "nurse",
      },
      {
        label: "Patient Dashboard",
        icon: Users,
        path: "/dashboard/patient",
        role: "patient",
      },
      {
        label: "Find Nurses",
        icon: UserCheck,
        path: "/nurses",
        role: "patient",
      },
      {
        label: "Services Catalog",
        icon: ClipboardList,
        path: "/dashboard/patient/services",
        role: "patient",
      },
      {
        label: "Connect Doctor",
        icon: HeartHandshake,
        path: "/dashboard/patient/connect-doctor",
        role: "patient",
      },
      {
        label: "My Bookings",
        icon: ClipboardList,
        path: "/dashboard/patient/bookings",
        role: "patient",
      },
      {
        label: "Care Assistant",
        icon: HeartHandshake,
        path: "/dashboard/patient/care-assistant-requests",
        role: "patient",
      },
      {
        label: "Reports",
        icon: FileText,
        path: "/dashboard/patient/reports",
        role: "patient",
      },
      {
        label: "Payments",
        icon: CreditCard,
        path: "/dashboard/patient/payments",
        role: "patient",
      },
      {
        label: "Book Ambulance",
        icon: Ambulance,
        path: "/book-ambulance",
        role: "patient",
      },
      {
        label: "Hospital ICU System",
        icon: Building2,
        path: "/hospital-system",
        role: "patient",
      },
      {
        label: "Care Assistant Dashboard",
        icon: HeartHandshake,
        path: "/dashboard/care-assistant",
        role: "care_assistant",
      },
      {
        label: "My Profile",
        icon: Settings,
        path: "/dashboard/care-assistant/profile",
        role: "care_assistant",
      },
      {
        label: "Support Requests",
        icon: ClipboardList,
        path: "/dashboard/care-assistant/requests",
        role: "care_assistant",
      },
      {
        label: "Transport Tasks",
        icon: Car,
        path: "/dashboard/care-assistant/transport",
        role: "care_assistant",
      },
    ],
    []
  );

  const menuItems = allMenuItems.filter((item) => item.role === role);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {}
    clearStoredAuth();
    router.push("/login");
  };

  if (!mounted) return null;

  const isActivePath = (itemPath: string) => {
    if (itemPath.includes("?")) {
      return pathname === itemPath.split("?")[0];
    }
    return pathname === itemPath;
  };

  const SidebarContent = () => (
    <>
      <div>
        <button
          onClick={() => router.push("/")}
          className="text-left text-2xl font-bold mb-10 text-teal-600"
        >
          CareConnect
        </button>

        <nav className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path);

            return (
              <motion.button
                key={item.label + item.path}
                whileHover={{ scale: 1.01, x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  router.push(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                  active
                    ? "bg-teal-50 text-teal-600 shadow-sm border border-teal-100"
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-10">
        <motion.button
          whileHover={{ scale: logoutLoading ? 1 : 1.01, x: logoutLoading ? 0 : 3 }}
          whileTap={{ scale: logoutLoading ? 1 : 0.98 }}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition text-left disabled:opacity-50"
          onClick={handleLogout}
          disabled={logoutLoading}
        >
          <LogOut size={18} />
          <span className="font-medium">
            {logoutLoading ? "Logging out..." : "Logout"}
          </span>
        </motion.button>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-[320px] h-[320px] bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] bg-cyan-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-emerald-100/20 rounded-full blur-3xl" />
      </div>

      <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 shadow-xl p-6 hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-xl font-bold text-teal-600"
        >
          CareConnect
        </button>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
          <div className="w-72 h-full bg-white p-6 shadow-2xl flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 pt-20 md:pt-6 md:p-8 lg:p-10">
        {children}
      </main>
    </div>
  );
}