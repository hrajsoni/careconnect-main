"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredSession } from "@/utils/session";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const { userId, role } = getStoredSession();

    if (!userId || !role) {
      router.replace("/login");
      return;
    }

    // Determine the required role based on pathname
    let requiredRole: string | null = null;
    if (pathname.startsWith("/dashboard/admin")) {
      requiredRole = "admin";
    } else if (pathname.startsWith("/dashboard/nurse")) {
      requiredRole = "nurse";
    } else if (pathname.startsWith("/dashboard/care-assistant")) {
      requiredRole = "care_assistant";
    } else if (pathname.startsWith("/dashboard/patient")) {
      requiredRole = "patient";
    }

    // If we're in a dashboard route, validate the role
    if (requiredRole && role !== requiredRole) {
      // Redirect to the correct dashboard for their role
      const dashboardMap: Record<string, string> = {
        admin: "/dashboard/admin",
        nurse: "/dashboard/nurse",
        care_assistant: "/dashboard/care-assistant",
        patient: "/dashboard/patient",
      };
      router.replace(dashboardMap[role] || "/dashboard/patient");
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setAllowed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router, pathname]);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
