"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import { CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function PatientServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services`);
        const data = await res.json();
        if (data.success) {
          setServices(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <AuthGuard requireRole="patient">
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Available Care Services</h1>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(svc => (
                <div key={svc._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-xl mb-3">{svc.name}</h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-bold mb-4">
                    Pricing starts at ₹{svc.price}
                  </div>
                  <p className="text-slate-600 mb-4">{svc.description}</p>

                  {svc.features && svc.features.length > 0 && (
                    <div className="space-y-2 mt-4 border-t pt-4">
                      <p className="font-semibold text-sm text-slate-800">Included Features:</p>
                      {svc.features.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-teal-500" />
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
