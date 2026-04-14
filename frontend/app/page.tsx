"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  MapPin,
  HeartHandshake,
  Stethoscope,
  Clock3,
  Star,
  ArrowRight,
  UserRound,
  Ambulance,
  BadgeCheck,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    title: "Elderly Care",
    icon: "🧓",
    description:
      "Compassionate support for seniors including mobility help, hygiene assistance, feeding, and companionship.",
  },
  {
    title: "Home Nursing",
    icon: "🏠",
    description:
      "Professional nursing services at home for recovery, monitoring, medication, and daily medical care.",
  },
  {
    title: "Medical Assistance",
    icon: "💉",
    description:
      "Certified nurses for injections, BP monitoring, sugar checks, dressing, IV support, and more.",
  },
  {
    title: "Emergency Support",
    icon: "🚑",
    description:
      "Urgent at-home nursing support for immediate care needs and fast professional assistance.",
  },
  {
    title: "Post-Hospital Care",
    icon: "🩺",
    description:
      "Recovery-focused care after discharge with patient monitoring, medication support, and assistance.",
  },
  {
    title: "Hospital Visit Companion",
    icon: "🤝",
    description:
      "Trusted assistance for patients needing help during hospital visits, follow-ups, checkups, and safe return home.",
  },
];

const steps = [
  {
    title: "Choose a Care Need",
    description:
      "Select the service you need, from elderly care and home nursing to medical assistance and hospital visit support.",
    icon: <Stethoscope className="w-6 h-6" />,
  },
  {
    title: "Find Verified Professionals",
    description:
      "Browse trained and verified nurses based on service type, availability, and nearby location.",
    icon: <ShieldCheck className="w-6 h-6" />,
  },
  {
    title: "Book with Confidence",
    description:
      "Confirm the booking, receive updates, and get dependable care delivered safely to your doorstep.",
    icon: <HeartHandshake className="w-6 h-6" />,
  },
];

const highlights = [
  {
    title: "Verified Professionals",
    description:
      "Every nurse is reviewed through document verification before becoming available on CareConnect.",
    icon: <BadgeCheck className="w-6 h-6" />,
  },
  {
    title: "Location-Based Matching",
    description:
      "Patients can find nearby nurses for faster response and more convenient care access.",
    icon: <MapPin className="w-6 h-6" />,
  },
  {
    title: "Reliable Home Support",
    description:
      "From post-hospital recovery to daily assistance, care reaches families where they need it most.",
    icon: <UserRound className="w-6 h-6" />,
  },
  {
    title: "Urgent Care Readiness",
    description:
      "Built for quick nurse discovery when immediate medical support is needed at home.",
    icon: <Ambulance className="w-6 h-6" />,
  },
];

const stats = [
  { label: "Verified Nurse Onboarding", value: "100%" },
  { label: "Home-Based Care Focus", value: "24/7" },
  { label: "Care Categories", value: "6+" },
  { label: "Trust-First Experience", value: "Safe" },
];

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dbServices, setDbServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        const res = await fetch(`${API_BASE}/api/services`);
        const data = await res.json();
        if (data.success && data.data) {
          setDbServices(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch services", err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role) {
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
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 overflow-hidden text-slate-900">
      {/* Hero Section */}
      <section className="relative px-6 md:px-10 lg:px-16 pt-10 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-semibold mb-6"
            >
              <ShieldCheck className="w-4 h-4" />
              Trusted, verified home healthcare support
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-tight text-slate-900"
            >
              Compassionate Healthcare
              <span className="block text-teal-500 mt-2">
                Delivered to Your Doorstep
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl"
            >
              CareConnect helps families find verified nurses and care support
              for home medical needs, elderly assistance, post-hospital recovery,
              and hospital visit companionship — safely, quickly, and reliably.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
              >
                Book a Service
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 px-8 py-4 rounded-full font-semibold shadow-sm hover:shadow-md transition"
              >
                Join as a Nurse
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
              className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-teal-500" />
                Verified nurses
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-500" />
                Location-based discovery
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-teal-500" />
                Convenient care scheduling
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-[2rem] border border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl p-6 md:p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 p-6 text-white shadow-lg min-h-[180px] flex flex-col justify-between">
                  <div className="text-sm font-semibold opacity-90">
                    At-Home Nursing
                  </div>
                  <div>
                    <div className="text-4xl font-bold">24/7</div>
                    <p className="text-sm opacity-90 mt-2">
                      Flexible nursing care designed for home recovery and
                      ongoing assistance.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 min-h-[180px] flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Verified Professionals
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">
                      Every nurse goes through an approval workflow before
                      joining the platform.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 min-h-[180px] flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Nearby Care Access
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">
                      Quickly find professionals based on area, availability,
                      and service type.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white min-h-[180px] flex flex-col justify-between shadow-lg">
                  <Star className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-bold">Patient-Centered Care</h3>
                    <p className="text-sm text-slate-200 mt-2">
                      Built for families seeking safe, compassionate, and
                      practical healthcare support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16 pb-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200 p-6 text-center shadow-sm"
            >
              <div className="text-3xl font-extrabold text-teal-600">
                {item.value}
              </div>
              <div className="text-sm text-slate-600 mt-2">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="services" className="px-6 md:px-12 lg:px-20 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <p className="text-teal-600 font-semibold tracking-[0.2em] uppercase text-sm">
            Our Services
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-3">
            Professional Care, Tailored for Every Need
          </h2>
          <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Explore our trusted range of at-home healthcare and patient support
            services designed for families, seniors, and recovering patients.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {dbServices.length > 0 ? (
            dbServices.map((service, index) => (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative min-h-[290px] rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50 opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 block truncate">
                    {service.name}
                  </h3>
                  <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-bold w-fit">
                    Starting at ₹{service.price}
                  </div>
                  <p className="text-slate-600 leading-relaxed flex-grow line-clamp-3">
                    {service.description}
                  </p>
                  {service.features && service.features.length > 0 && (
                    <div className="mt-4 space-y-1">
                      {service.features.slice(0, 3).map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-center text-xs text-slate-500">
                          <CheckCircle2 className="w-3 h-3 text-teal-500 mr-1.5" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/signup" className="mt-6 flex items-center text-teal-600 font-semibold cursor-pointer z-20">
                    Book Now
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-2">
                      →
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative min-h-[290px] rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50 opacity-0 group-hover:opacity-100 transition duration-500" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-3xl shadow-lg mb-6">
                    {service.icon}
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {service.title}
                  </h3>

                  <p className="text-slate-600 leading-relaxed flex-grow">
                    {service.description}
                  </p>

                  <Link href="/signup" className="mt-8 flex items-center text-teal-600 font-semibold cursor-pointer z-20">
                    Learn More
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-2">
                      →
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <section
        id="how-it-works"
        className="px-6 md:px-12 lg:px-20 py-20 bg-white/60"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 font-semibold tracking-[0.2em] uppercase text-sm">
              How It Works
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-3">
              Simple, Safe, and Reliable
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              CareConnect makes home healthcare more accessible by connecting
              patients with verified professionals in just a few steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-xl transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6">
                  {step.icon}
                </div>
                <div className="text-sm font-bold text-teal-600 mb-2">
                  Step {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="px-6 md:px-12 lg:px-20 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 font-semibold tracking-[0.2em] uppercase text-sm">
              Why CareConnect
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-3">
              Built Around Trust, Care, and Convenience
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              We are creating a healthcare service experience that is dependable,
              transparent, and designed for real family needs.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-8">
            {highlights.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-xl transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md mb-6">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 p-10 md:p-14 text-white shadow-2xl"
        >
          <div className="max-w-3xl">
            <p className="uppercase tracking-[0.25em] text-sm text-teal-200 font-semibold">
              Get Started
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 leading-tight">
              Trusted Care for Your Loved Ones Starts Here
            </h2>
            <p className="mt-5 text-slate-200 text-lg leading-relaxed">
              Whether you need a verified nurse for home care or a reliable
              medical companion for hospital visits, CareConnect is built to
              make care more accessible, secure, and comforting.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition"
              >
                Register Now
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-7 py-4 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition"
              >
                Login to Dashboard
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-slate-600">
          <div>
            <span className="font-bold text-slate-900">
              Care<span className="text-teal-500">Connect</span>
            </span>{" "}
            — Compassionate healthcare, closer to home.
          </div>

          <div className="flex flex-wrap gap-6">
            <a href="#services" className="hover:text-teal-600 transition">
              Services
            </a>
            <a href="#how-it-works" className="hover:text-teal-600 transition">
              How It Works
            </a>
            <a href="#why-us" className="hover:text-teal-600 transition">
              Why CareConnect
            </a>
            <Link href="/login" className="hover:text-teal-600 transition">
              Login
            </Link>
            <Link href="/signup" className="hover:text-teal-600 transition">
              Signup
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}