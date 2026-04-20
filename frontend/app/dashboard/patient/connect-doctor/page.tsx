"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import { Stethoscope, Calendar, CreditCard, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function ConnectDoctorPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeciality, setSelectedSpeciality] = useState("All");

  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: list, 2: details, 3: payment succ

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const data = await res.json();
        if (data.success) {
          setDoctors(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const specialities = useMemo(() => {
    const set = new Set(doctors.map(d => d.speciality));
    return ["All", ...Array.from(set)];
  }, [doctors]);

  const filteredDoctors = selectedSpeciality === "All"
    ? doctors
    : doctors.filter(d => d.speciality === selectedSpeciality);

  const handleBook = async () => {
    try {
      if (!selectedDoctor) return;
      const res = await fetchWithTimeout(`${API_BASE}/api/doctors/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctor._id, amount: selectedDoctor.fee }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setStep(3); // success
      } else {
        alert(data.message || "Booking failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error booking appointment");
    }
  };

  return (
    <AuthGuard requireRole="patient">
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <Stethoscope className="w-8 h-8 text-blue-500" />
                Connect With a Doctor
              </h1>

              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {specialities.map(spec => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpeciality(spec)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition ${selectedSpeciality === spec ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              {loading ? (
                <p>Loading doctors...</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map(doc => (
                    <div key={doc._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition">
                      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <Stethoscope className="w-7 h-7" />
                      </div>
                      <h3 className="font-bold text-xl mb-1">{doc.name}</h3>
                      <p className="text-blue-600 font-semibold mb-2">{doc.speciality}</p>
                      <p className="text-slate-500 text-sm mb-4">{doc.experience} Years Exp | {doc.hospital}</p>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                        <span className="font-bold text-slate-800">₹{doc.fee}</span>
                        <button
                          onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && selectedDoctor && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Confirm Appointment</h2>

              <div className="bg-slate-50 p-6 rounded-2xl mb-6">
                <h3 className="font-bold text-xl">{selectedDoctor.name}</h3>
                <p className="text-blue-600">{selectedDoctor.speciality}</p>
                <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                  <span>Consultation Fee:</span>
                  <span>₹{selectedDoctor.fee}</span>
                </div>
              </div>

              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl mb-6 flex gap-3 text-sm">
                <CreditCard className="w-5 h-5 flex-shrink-0" />
                <p>This is a dummy payment showcase. Clicking Pay will simulate a successful transaction and book the appointment.</p>
              </div>

              <div className="flex gap-4">
                <button onClick={handleBook} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold text-lg">
                  Pay ₹{selectedDoctor.fee} & Book
                </button>
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-100 rounded-2xl font-bold text-slate-700">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white p-10 rounded-3xl shadow-sm border max-w-lg mx-auto text-center">
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
              <p className="text-slate-600 mb-8">Your appointment with {selectedDoctor?.name} has been confirmed.</p>
              <button onClick={() => { setStep(1); setSelectedDoctor(null); }} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold">
                Done
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
