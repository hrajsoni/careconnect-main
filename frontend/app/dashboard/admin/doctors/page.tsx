"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import { Plus, Edit, Trash } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    speciality: "",
    fee: 0,
    experience: 0,
    hospital: "",
  });

  const fetchDoctors = async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/doctors/admin`, {
        credentials: "include"
      });
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

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${API_BASE}/api/doctors/${editingId}`
        : `${API_BASE}/api/doctors`;

      const method = editingId ? "PUT" : "POST";

      await fetchWithTimeout(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      setFormData({ name: "", speciality: "", fee: 0, experience: 0, hospital: "" });
      setShowAdd(false);
      setEditingId(null);
      fetchDoctors();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetchWithTimeout(`${API_BASE}/api/doctors/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      fetchDoctors();
    } catch (err) { }
  };

  const handleEdit = (doc: any) => {
    setEditingId(doc._id);
    setFormData({
      name: doc.name,
      speciality: doc.speciality,
      fee: doc.fee,
      experience: doc.experience,
      hospital: doc.hospital || "",
    });
    setShowAdd(true);
  };

  return (
    <AuthGuard requireRole="admin">
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Manage Doctors</h1>
            <button
              onClick={() => { setShowAdd(!showAdd); setEditingId(null); setFormData({ name: "", speciality: "", fee: 0, experience: 0, hospital: "" }); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" /> Add Doctor
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow border mb-6 space-y-4">
              <h2 className="text-xl font-bold">{editingId ? "Edit Doctor" : "New Doctor"}</h2>
              <input
                type="text" placeholder="Dr. Name" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="text" placeholder="Speciality" required value={formData.speciality}
                onChange={e => setFormData({ ...formData, speciality: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="number" placeholder="Consultation Fee" required value={formData.fee}
                onChange={e => setFormData({ ...formData, fee: Number(e.target.value) })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="number" placeholder="Experience (Years)" required value={formData.experience}
                onChange={e => setFormData({ ...formData, experience: Number(e.target.value) })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="text" placeholder="Hospital/Clinic" value={formData.hospital}
                onChange={e => setFormData({ ...formData, hospital: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl">Save</button>
                <button type="button" onClick={() => setShowAdd(false)} className="bg-slate-200 px-6 py-2 rounded-xl">Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {doctors.map(doc => (
                <div key={doc._id} className="bg-white p-6 rounded-2xl shadow border">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-xl">{doc.name}</h3>
                    <div className="font-bold text-blue-600">₹{doc.fee}</div>
                  </div>
                  <p className="text-slate-600 font-semibold">{doc.speciality}</p>
                  <p className="text-sm text-slate-500 mb-4">{doc.experience} Years Exp | {doc.hospital}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(doc)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(doc._id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
