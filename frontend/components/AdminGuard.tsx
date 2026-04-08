"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession } from "@/utils/session";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const { userId, role } = getStoredSession();

    if (!userId || !role) {
      router.replace("/login");
      return;
    }

    if (role !== "admin") {
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

    const frame = window.requestAnimationFrame(() => {
      setAllowed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  if (!allowed) return null;

  return <>{children}</>;
}
