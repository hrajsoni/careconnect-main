"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import { Plus, Edit, Trash, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    features: "",
  });

  const fetchServices = async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/services/admin`, {
        credentials: "include"
      });
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

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      features: formData.features.split(",").map(f => f.trim()).filter(Boolean),
    };

    try {
      const url = editingId
        ? `${API_BASE}/api/services/${editingId}`
        : `${API_BASE}/api/services`;

      const method = editingId ? "PUT" : "POST";

      await fetchWithTimeout(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      setFormData({ name: "", description: "", price: 0, features: "" });
      setShowAdd(false);
      setEditingId(null);
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetchWithTimeout(`${API_BASE}/api/services/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      fetchServices();
    } catch (err) { }
  };

  const handleEdit = (svc: any) => {
    setEditingId(svc._id);
    setFormData({
      name: svc.name,
      description: svc.description,
      price: svc.price,
      features: svc.features ? svc.features.join(", ") : "",
    });
    setShowAdd(true);
  };

  return (
    <AuthGuard requireRole="admin">
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Manage Services</h1>
            <button
              onClick={() => { setShowAdd(!showAdd); setEditingId(null); setFormData({ name: "", description: "", price: 0, features: "" }); }}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-teal-700"
            >
              <Plus className="w-5 h-5" /> Add Service
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow border mb-6 space-y-4">
              <h2 className="text-xl font-bold">{editingId ? "Edit Service" : "New Service"}</h2>
              <input
                type="text" placeholder="Service Name" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <textarea
                placeholder="Description" required value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="number" placeholder="Base Price" required value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="text" placeholder="Features (comma separated)" value={formData.features}
                onChange={e => setFormData({ ...formData, features: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-xl">Save</button>
                <button type="button" onClick={() => setShowAdd(false)} className="bg-slate-200 px-6 py-2 rounded-xl">Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.map(svc => (
                <div key={svc._id} className="bg-white p-6 rounded-2xl shadow border">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-xl">{svc.name}</h3>
                    <div className="font-bold text-teal-600">₹{svc.price}</div>
                  </div>
                  <p className="text-slate-600 mb-4">{svc.description}</p>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {svc.features?.map((f: string, i: number) => (
                      <span key={i} className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(svc)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(svc._id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash className="w-5 h-5" /></button>
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
