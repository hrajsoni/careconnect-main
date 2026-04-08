"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Ambulance,
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarClock,
  ClipboardPlus,
  Database,
  HeartHandshake,
  Home,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

const services = [
  {
    title: "Home Nursing",
    description:
      "Book trained nurses for injections, wound dressing, medication support, BP monitoring, and routine care at home.",
    Icon: Home,
  },
  {
    title: "Care Companion",
    description:
      "Arrange hospital visit assistance for elderly patients and people who need support during appointments and safe return home.",
    Icon: Users,
  },
  {
    title: "Family Notifications",
    description:
      "Keep family members informed when a service is accepted, scheduled, and completed.",
    Icon: BellRing,
  },
  {
    title: "Verified Providers",
    description:
      "Provider onboarding supports verification workflows for nurses and care assistants before active service delivery.",
    Icon: BadgeCheck,
  },
  {
    title: "Booking Management",
    description:
      "Track service requests, schedules, records, and status updates through role-based dashboards.",
    Icon: CalendarClock,
  },
  {
    title: "Digital Records",
    description:
      "Maintain organized service history, patient reports, and healthcare support records in one platform.",
    Icon: Database,
  },
];

const workflow = [
  {
    title: "Patient creates a request",
    description:
      "The user selects a care need, preferred date, time, and service type through the web application.",
    Icon: ClipboardPlus,
  },
  {
    title: "Provider accepts the service",
    description:
      "A nurse or care assistant reviews the request, accepts it, and prepares for the visit.",
    Icon: ShieldCheck,
  },
  {
    title: "Care is delivered",
    description:
      "The provider completes the home visit or hospital accompaniment and updates the service status.",
    Icon: Stethoscope,
  },
  {
    title: "Family is informed",
    description:
      "The platform records the outcome and can notify the selected family contact after completion.",
    Icon: HeartHandshake,
  },
];

const modules = [
  "Patient registration and login",
  "Nurse dashboard and verification flow",
  "Care assistant dashboard and requests",
  "Admin control panel",
  "Booking and scheduling system",
  "Reports, payments, and service tracking",
];

const stack = [
  { label: "Frontend", value: "Next.js, React, Tailwind CSS, TypeScript" },
  { label: "Backend", value: "Node.js, Express.js, JWT and cookie auth" },
  { label: "Database", value: "MongoDB with Mongoose models" },
  { label: "Security", value: "CSRF token flow, HTTPOnly auth cookies, role guards" },
];

const outcomes = [
  "Improves access to home healthcare for elderly and recovering patients",
  "Reduces friction in finding verified help for simple but urgent care needs",
  "Supports family transparency through service completion updates",
  "Demonstrates a complete multi-role healthcare web platform for practical use",
];

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
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
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center text-slate-400">
        Loading CareConnect...
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50 text-slate-900">
      <section className="relative px-6 md:px-10 lg:px-16 pt-10 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/30 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700"
            >
              <Sparkles className="h-4 w-4" />
              Role-based healthcare coordination platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl text-5xl font-bold leading-tight text-slate-900 md:text-6xl xl:text-7xl"
            >
              CareConnect
              <span className="mt-2 block text-teal-500">
                Home healthcare and patient companion support in one platform
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75 }}
              className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 md:text-xl"
            >
              CareConnect is a web-based healthcare assistance platform that helps
              patients book nurses for home services and arrange trained care
              companions for hospital visits. It is designed as a practical,
              full-stack solution for accessibility, transparency, and service
              coordination.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-8 py-4 font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-teal-600 hover:shadow-xl"
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 shadow-sm transition hover:shadow-md"
              >
                Browse Services
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-teal-500" />
                Verified provider onboarding
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-500" />
                Location-aware nurse discovery
              </div>
              <div className="flex items-center gap-2">
                <Ambulance className="h-4 w-4 text-teal-500" />
                Hospital companion service
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">
                        Platform Overview
                      </p>
                      <h2 className="mt-3 text-2xl font-bold">
                        Centralized healthcare support workflow
                      </h2>
                    </div>
                    <ShieldCheck className="h-10 w-10 text-teal-200" />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-200">
                    Patients, nurses, care assistants, and admins operate through
                    dedicated dashboards with centralized booking, approval, and
                    notification logic.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">User Roles</p>
                  <p className="mt-3 text-4xl font-extrabold text-teal-600">4</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Patient, Nurse, Care Assistant, Admin
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Core Services</p>
                  <p className="mt-3 text-4xl font-extrabold text-cyan-600">2</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Home nursing and hospital companion support
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Security Flow</p>
                  <p className="mt-3 text-lg font-bold text-slate-900">Cookie auth + CSRF</p>
                  <p className="mt-2 text-sm text-slate-600">
                    HTTPOnly cookie sessions with request protection
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Use Case</p>
                  <p className="mt-3 text-lg font-bold text-slate-900">College + portfolio</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Suitable for demo, viva, and project showcase presentation
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-10 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Role-based dashboards", value: "4" },
            { label: "Core support journeys", value: "2" },
            { label: "Full-stack modules", value: "6+" },
            { label: "Showcase readiness", value: "Built" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur-md"
            >
              <div className="text-3xl font-extrabold text-teal-600">{item.value}</div>
              <div className="mt-2 text-sm text-slate-600">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="services" className="px-6 py-20 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
            Core Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-5xl">
            Services and modules aligned with a real product workflow
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">
            The platform supports the real multi-user workflows expected in a
            healthcare service management system.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ title, description, Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.07 }}
              className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg">
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
              <p className="mt-4 leading-relaxed text-slate-600">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-white/60 px-6 py-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-5xl">
              A clean workflow from patient request to completed care
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              The same flow is used across the application to keep bookings,
              approvals, and updates consistent.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map(({ title, description, Icon }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-sm font-bold text-teal-600">
                  Step {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="px-6 py-20 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
              Why CareConnect
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-5xl">
              Built around a real healthcare gap, not a generic booking idea
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Existing systems often focus on doctor appointments or broader
              institutional healthcare services. CareConnect focuses on the smaller,
              urgent, and practical care needs families struggle to arrange quickly.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Expected outcomes</h3>
              <ul className="mt-4 space-y-3 text-slate-600">
                {outcomes.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900">System modules</h3>
              <div className="mt-5 grid gap-3">
                {modules.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-700 p-8 text-white shadow-xl">
              <h3 className="text-2xl font-bold">Technology stack</h3>
              <div className="mt-5 space-y-4">
                {stack.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-100">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-100">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-6xl rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 p-10 text-white shadow-2xl md:p-14"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-200">
              Product Ready
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
              Present the idea, architecture, and working flow with confidence
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">
              This project now has a stronger foundation for evaluation,
              portfolio review, and further feature expansion. The landing page
              introduces the platform clearly, while the dashboards demonstrate
              the live workflows.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Register a Demo User
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                Open Dashboard Login
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
