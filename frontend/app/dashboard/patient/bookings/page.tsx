"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  MapPin,
  HeartHandshake,
  ClipboardList,
  Activity,
  FileText,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Pencil,
  XCircle,
  Ambulance,
  Building2,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/Modal";
import { clearStoredAuth } from "@/utils/session";

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

export default function PatientBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "accepted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPaymentStyles = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700";
      case "failed":
        return "bg-red-50 text-red-700";
      case "refunded":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const fetchBookings = async () => {
    const patientId = localStorage.getItem("userId");

    if (!patientId) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/bookings/patient/${patientId}`, {
        credentials: "include",
      });
      
      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch bookings");
      }

      const bookingList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setBookings(bookingList);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to fetch bookings",
      });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (!message.text) return;

    const timer = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "pending" ||
          booking.status === "accepted" ||
          booking.status === "in_progress"
      ),
    [bookings]
  );

  const pastBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "completed" || booking.status === "cancelled"
      ),
    [bookings]
  );

  const handlePayNow = async (bookingId: string) => {
    try {
      setPayingBookingId(bookingId);

      const paymentRes = await fetchWithTimeout(`${API_BASE}/api/payments/booking/${bookingId}`, {
        credentials: "include",
      });
      
      if (paymentRes.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const paymentData = await safeParseResponse(paymentRes);

      if (!paymentRes.ok) {
        throw new Error(paymentData?.message || "Payment record not found");
      }

      const payment = paymentData?.data || paymentData;
      
      router.push(`/dummy-payment?paymentId=${payment._id}&amount=${payment.amount}`);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to proceed to payment.",
      });
    } finally {
      setPayingBookingId(null);
    }
  };

  const openEditModal = (booking: any) => {
    setSelectedBooking(booking);
    setEditForm({
      date: booking.date || "",
      time: booking.time || "",
      location: booking.location || "",
      notes: booking.notes || "",
    });
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;

    try {
      setProcessingBookingId(selectedBooking._id);

      const res = await fetchWithTimeout(`${API_BASE}/api/bookings/update/${selectedBooking._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Unable to update booking");
      }

      setMessage({
        type: "success",
        text: "Booking updated successfully.",
      });

      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to update booking.",
      });
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const confirmed = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirmed) return;

    try {
      setProcessingBookingId(bookingId);

      const res = await fetchWithTimeout(`${API_BASE}/api/bookings/cancel/${bookingId}`, {
        method: "PUT",
        credentials: "include",
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }
      const data = await safeParseResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Unable to cancel booking");
      }

      setMessage({
        type: "success",
        text: "Booking cancelled successfully.",
      });

      fetchBookings();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Unable to cancel booking.",
      });
    } finally {
      setProcessingBookingId(null);
    }
  };

  const renderBookingCard = (booking: any, index: number) => (
    <motion.div
      key={booking._id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusStyles(
                booking.status
              )}`}
            >
              <HeartHandshake className="w-4 h-4" />
              {booking.status || "pending"}
            </div>

            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPaymentStyles(
                booking.paymentStatus
              )}`}
            >
              <CreditCard className="w-4 h-4" />
              Payment: {booking.paymentStatus || "pending"}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {booking.service || "Service"}
          </h2>
          <p className="text-slate-500 mt-1">
            Nurse: {booking.nurseId?.name || "Assigned Nurse"}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarDays className="w-4 h-4 text-teal-500" />
            {booking.date || "Not set"}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock3 className="w-4 h-4 text-teal-500" />
            {booking.time || "Not set"}
          </div>
          <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
            <MapPin className="w-4 h-4 text-teal-500" />
            {booking.location || "No location"}
          </div>
          <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
            <CreditCard className="w-4 h-4 text-teal-500" />
            Amount: Rs. {booking.paymentAmount || 0}
          </div>
        </div>
      </div>

      {booking.notes && (
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-1">Booking Notes</p>
          {booking.notes}
        </div>
      )}

      {(booking.status === "pending" || booking.status === "accepted" || booking.status === "in_progress") && (
        <div className="mt-5 flex flex-wrap gap-3">
          {booking.status === "accepted" && booking.paymentStatus !== "paid" && (
            <Button
              type="button"
              onClick={() => handlePayNow(booking._id)}
              disabled={payingBookingId === booking._id}
              className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
            >
              {payingBookingId === booking._id ? "Processing Payment..." : "Pay Now"}
            </Button>
          )}

          {(booking.status === "pending" || booking.status === "accepted") && (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => openEditModal(booking)}
                disabled={processingBookingId === booking._id}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modify Booking
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-2xl text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleCancelBooking(booking._id)}
                disabled={processingBookingId === booking._id}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Booking
              </Button>
            </>
          )}

          {/* Ambulance button — always visible for active bookings */}
          <button
            type="button"
            onClick={() =>
              router.push(
                `/book-ambulance?bookingId=${booking._id}&patientId=${booking.patientId?._id || booking.patientId || ""}`
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-sm hover:from-red-600 hover:to-rose-700 transition shadow-md shadow-red-200"
          >
            <Ambulance className="w-4 h-4" />
            Book Ambulance
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/hospital-system?bookingId=${booking._id}&patientId=${booking.patientId?._id || booking.patientId || ""}`
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-teal-200 text-teal-700 font-semibold text-sm hover:bg-teal-50 transition"
          >
            <Building2 className="w-4 h-4" />
            View Hospital ICU Beds
          </button>
        </div>
      )}

      {booking.visitSummary?.updatedAt && (
        <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-teal-900">
              Visit Outcome / Nurse Notes
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700">
            <p><strong>Blood Pressure:</strong> {booking.visitSummary.bloodPressure || "—"}</p>
            <p><strong>Temperature:</strong> {booking.visitSummary.temperature || "—"}</p>
            <p><strong>Sugar Level:</strong> {booking.visitSummary.sugarLevel || "—"}</p>
            <p><strong>Oxygen Level:</strong> {booking.visitSummary.oxygenLevel || "—"}</p>
            <p><strong>Pulse Rate:</strong> {booking.visitSummary.pulseRate || "—"}</p>
            <p><strong>Follow-up Required:</strong> {booking.visitSummary.followUpRequired ? "Yes" : "No"}</p>
          </div>

          {booking.visitSummary.treatmentProvided && (
            <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <p className="font-semibold text-slate-800">Treatment Provided</p>
              </div>
              <p className="text-sm text-slate-600">
                {booking.visitSummary.treatmentProvided}
              </p>
            </div>
          )}

          {booking.visitSummary.notes && (
            <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <p className="font-semibold text-slate-800">Nurse Observations</p>
              </div>
              <p className="text-sm text-slate-600">
                {booking.visitSummary.notes}
              </p>
            </div>
          )}

          {booking.visitSummary.followUpNotes && (
            <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-teal-600" />
                <p className="font-semibold text-slate-800">Follow-up Notes</p>
              </div>
              <p className="text-sm text-slate-600">
                {booking.visitSummary.followUpNotes}
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Last updated: {new Date(booking.visitSummary.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </motion.div>
  );

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                My Bookings
              </h1>
              <p className="text-slate-500 mt-2">
                Manage upcoming appointments, modify bookings, cancel bookings, and review past visits.
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
                Loading bookings...
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                      Active / Upcoming Bookings
                    </h2>

                    {activeBookings.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                        <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">
                          No active bookings
                        </h3>
                        <p className="text-slate-500 mt-2">
                          Your pending and accepted bookings will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {activeBookings.map((booking, index) =>
                          renderBookingCard(booking, index)
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                      Past Bookings
                    </h2>

                    {pastBookings.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                        <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">
                          No past bookings
                        </h3>
                        <p className="text-slate-500 mt-2">
                          Completed or cancelled bookings will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {pastBookings.map((booking, index) =>
                          renderBookingCard(booking, index)
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Modal
              isOpen={!!selectedBooking}
              onClose={() => setSelectedBooking(null)}
            >
              <div className="pt-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Modify Booking
                </h2>
                <p className="text-slate-500 mb-6">
                  Update the date, time, address, or notes for this booking.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Service address / area"
                  className="w-full mt-4 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />

                <textarea
                  rows={4}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Update booking notes..."
                  className="w-full mt-4 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedBooking(null)}
                  >
                    Close
                  </Button>

                  <Button
                    className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleUpdateBooking}
                    disabled={processingBookingId === selectedBooking?._id}
                  >
                    {processingBookingId === selectedBooking?._id
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Modal>

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
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
