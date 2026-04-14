"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFixedPrice } from '@/utils/pricing';
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  MapPin,
  Phone,
  GraduationCap,
  BriefcaseMedical,
  IndianRupee,
  CalendarDays,
  Clock3,
  FileText,
  CheckCircle2,
  AlertCircle,
  BadgeInfo,
  CreditCard,
  TimerReset,
  CalendarClock,
  LocateFixed,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { clearStoredAuth } from "@/utils/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
    return {
      success: false,
      message: "Unexpected server response received.",
      raw: rawText,
    };
  }
}

function generateTimeSlots(startTime: string, endTime: string, duration: number) {
  if (!startTime || !endTime || !duration) return [];

  const slots: string[] = [];

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = new Date();
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date();
  end.setHours(endHour, endMinute, 0, 0);

  while (start < end) {
    const hh = String(start.getHours()).padStart(2, "0");
    const mm = String(start.getMinutes()).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
    start.setMinutes(start.getMinutes() + duration);
  }

  return slots;
}

export default function NurseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const nurseId = params?.id as string;

  const [nurse, setNurse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [geoLoading, setGeoLoading] = useState(false);

  const [bookingData, setBookingData] = useState({
    service: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    const fetchNurse = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/nurses/${nurseId}`);
        const data = await safeParseResponse(res);

        if (!res.ok) {
          throw new Error(data?.message || "Unable to load nurse profile");
        }

        const nurseData = data?.data || data;
        setNurse(nurseData);

        setBookingData((prev) => ({
          ...prev,
          service: nurseData?.services?.[0] || "",
          // location field starts empty — user enters their address when booking
          location: "",
        }));
      } catch (error) {
        console.error(error);
        setNurse(null);
      } finally {
        setLoading(false);
      }
    };

    if (nurseId) fetchNurse();
  }, [nurseId]);

  useEffect(() => {
    if (!message.text) return;

    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const availability = useMemo(() => {
    return nurse?.availability || {};
  }, [nurse]);

  const selectedServicePrice = useMemo(() => {
    if (!bookingData.service) return null;
    return getFixedPrice(bookingData.service);
  }, [bookingData.service]);

  const availableDays = useMemo(() => {
    return Array.isArray(availability?.availableDays)
      ? availability.availableDays
      : [];
  }, [availability]);

  const generatedSlots = useMemo(() => {
    return generateTimeSlots(
      availability?.startTime || "",
      availability?.endTime || "",
      Number(availability?.slotDuration || 30)
    );
  }, [availability]);

  const selectedDateDayName = useMemo(() => {
    if (!bookingData.date) return "";
    const date = new Date(bookingData.date);
    if (isNaN(date.getTime())) return "";
    return WEEK_DAYS[date.getDay()];
  }, [bookingData.date]);

  const isSelectedDayAvailable = useMemo(() => {
    if (!bookingData.date) return true;
    return availableDays.includes(selectedDateDayName);
  }, [bookingData.date, availableDays, selectedDateDayName]);

  const handleBookingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setBookingData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data?.address || {};
          // Build a full, precise address from available parts
          const parts = [
            a.house_number,
            a.road || a.pedestrian || a.footway,
            a.neighbourhood || a.suburb || a.quarter,
            a.city || a.town || a.village || a.county,
            a.state_district,
            a.state,
            a.postcode,
          ].filter(Boolean);
          const locationStr = parts.length >= 2 ? parts.join(", ") : (data?.display_name || "");
          setBookingData((prev) => ({ ...prev, location: locationStr }));
        } catch {
          setMessage({ type: "error", text: "Could not resolve location. Please enter manually." });
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setMessage({ type: "error", text: "Location access denied. Please enter manually." });
        } else {
          setMessage({ type: "error", text: "Unable to detect location. Please enter manually." });
        }
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const createBooking = async () => {
    const patientId = localStorage.getItem("userId");
    const role = localStorage.getItem("role");

    if (!patientId) {
      setMessage({
        type: "error",
        text: "Please login first to create a booking.",
      });

      setTimeout(() => {
        router.push("/login");
      }, 1200);
      return;
    }

    if (role !== "patient") {
      setMessage({
        type: "error",
        text: "Only patients can create bookings.",
      });
      return;
    }

    if (!nurse?.availability?.isAvailableForBooking) {
      setMessage({
        type: "error",
        text: "This nurse is currently not accepting new bookings.",
      });
      return;
    }

    if (
      !bookingData.service.trim() ||
      !bookingData.date.trim() ||
      !bookingData.time.trim() ||
      !bookingData.location.trim()
    ) {
      setMessage({
        type: "error",
        text: "Please fill service, date, time, and location.",
      });
      return;
    }

    if (!isSelectedDayAvailable) {
      setMessage({
        type: "error",
        text: `This nurse is not available on ${selectedDateDayName}.`,
      });
      return;
    }

    setBookingLoading(true);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/bookings/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          nurseId,
          service: bookingData.service,
          date: bookingData.date,
          time: bookingData.time,
          location: bookingData.location,
          notes: bookingData.notes,
        }),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Booking failed");
      }

      setMessage({
        type: "success",
        text: "Booking created successfully. Redirecting to payment...",
      });

      const paymentId = data.data?.payment?._id || data.payment?._id;
      const paymentAmount = bookingData.service ? getFixedPrice(bookingData.service) : "";

      setTimeout(() => {
        if (paymentId) {
          router.push(`/dummy-payment?paymentId=${paymentId}&amount=${paymentAmount}`);
        } else {
          router.push("/dashboard/patient/bookings");
        }
      }, 1500);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Unable to create booking.",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center text-slate-400">
        Loading nurse profile...
      </main>
    );
  }

  if (!nurse) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl w-full">
          <h1 className="text-2xl font-bold text-slate-900">Nurse not found</h1>
          <p className="text-slate-500 mt-2">
            The requested nurse profile is unavailable or no longer approved.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 px-6 py-10 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
        {/* Left side */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={
                    nurse.photo
                      ? `${API_BASE}/${nurse.photo}`
                      : "/placeholder-user.png"
                  }
                  alt={nurse.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-extrabold text-slate-900">
                    {nurse.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    Approved Nurse
                  </span>
                </div>

                <p className="text-slate-500 mt-2 text-lg">
                  {nurse.qualification || "Registered Healthcare Professional"}
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-5 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-teal-500" />
                    {nurse.location || "Location not specified"}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-teal-500" />
                    {nurse.phone || "Phone not available"}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="w-4 h-4 text-teal-500" />
                    {nurse.qualification || "Not specified"}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <BriefcaseMedical className="w-4 h-4 text-teal-500" />
                    {nurse.experience || 0} year
                    {nurse.experience === 1 ? "" : "s"} experience
                  </div>

                  {nurse.specialization && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <BadgeInfo className="w-4 h-4 text-teal-500" />
                      Specialization: {nurse.specialization}
                    </div>
                  )}

                  {nurse.registrationNumber && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <CreditCard className="w-4 h-4 text-teal-500" />
                      Reg. No: {nurse.registrationNumber}
                    </div>
                  )}
                </div>

                {nurse.bio && (
                  <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900 mb-2">
                      Professional Introduction
                    </h3>
                    <p className="text-slate-600 leading-relaxed">{nurse.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Services Offered
            </h2>

            {nurse.services?.length ? (
              <div className="grid md:grid-cols-2 gap-4">
                {nurse.services.map((service: string) => (
                  <div
                    key={service}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800">{service}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Professional care service available for booking.
                        </p>
                      </div>

                      <div className="shrink-0 text-sm font-bold text-teal-700 bg-white border border-teal-100 rounded-xl px-3 py-2 flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {getFixedPrice(service)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                No services have been added by this nurse yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarClock className="w-6 h-6 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">
                Availability
              </h2>
            </div>

            {!nurse.availability?.isAvailableForBooking ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                This nurse is currently not accepting new booking requests.
              </div>
            ) : availableDays.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                Availability schedule has not been added yet.
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Available Days
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {availableDays.map((day: string) => (
                      <span
                        key={day}
                        className="px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-sm font-semibold"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500 mb-1">Working Hours</p>
                    <p className="font-semibold text-slate-900">
                      {availability.startTime || "—"} to {availability.endTime || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500 mb-1">Slot Duration</p>
                    <p className="font-semibold text-slate-900">
                      {availability.slotDuration || 30} minutes
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500 mb-1">Booking Status</p>
                    <p className="font-semibold text-emerald-700">Accepting bookings</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side booking */}
        <div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sticky top-28">
            <h2 className="text-2xl font-bold text-slate-900">
              Book This Nurse
            </h2>
            <p className="text-slate-500 mt-2">
              Select a service and choose from the nurse's available schedule.
            </p>

            {selectedServicePrice !== null && selectedServicePrice !== undefined && (
              <div className="mt-4 rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm font-semibold text-teal-700">
                Selected service price: ₹{selectedServicePrice}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Select Service
                </label>
                <select
                  name="service"
                  value={bookingData.service}
                  onChange={handleBookingChange}
                  disabled={!nurse.services?.length}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                >
                  {nurse.services?.length ? (
                    nurse.services.map((service: string) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))
                  ) : (
                    <option value="">No service available</option>
                  )}
                </select>
              </div>

              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="date"
                  name="date"
                  value={bookingData.date}
                  onChange={handleBookingChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {bookingData.date && !isSelectedDayAvailable && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  This nurse is not available on {selectedDateDayName}.
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Select Time Slot
                </label>
                <select
                  name="time"
                  value={bookingData.time}
                  onChange={handleBookingChange}
                  disabled={!generatedSlots.length || !isSelectedDayAvailable}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                >
                  <option value="">Choose available slot</option>
                  {generatedSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {generatedSlots.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                    <TimerReset className="w-4 h-4 text-teal-600" />
                    Slot Information
                  </div>
                  <p className="text-sm text-slate-600">
                    Booking slots are generated based on the nurse's working hours:
                    {` ${availability.startTime || "—"} to ${availability.endTime || "—"}`}
                    {" • "}
                    {availability.slotDuration || 30} min slots
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Service Address</label>
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition disabled:opacity-60"
                  >
                    {geoLoading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Detecting...</>
                    ) : (
                      <><LocateFixed className="w-3 h-3" /> Use Current Location</>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    name="location"
                    value={bookingData.location}
                    onChange={handleBookingChange}
                    placeholder="Service address / area"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="relative">
                <FileText className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                <textarea
                  name="notes"
                  rows={5}
                  value={bookingData.notes}
                  onChange={handleBookingChange}
                  placeholder="Add medical condition, care notes, or special instructions..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <Button
                type="button"
                onClick={createBooking}
                disabled={
                  bookingLoading ||
                  !nurse.services?.length ||
                  !nurse.availability?.isAvailableForBooking ||
                  !isSelectedDayAvailable
                }
                className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
              >
                {bookingLoading ? "Creating Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white font-bold flex items-center gap-2 z-50 ${
              message.type === "success" ? "bg-teal-600" : "bg-red-500"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
