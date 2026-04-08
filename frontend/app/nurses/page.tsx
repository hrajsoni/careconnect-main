"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  ShieldCheck,
  Stethoscope,
  IndianRupee,
  ArrowRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function NursesPage() {
  const [allNurses, setAllNurses] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchService, setSearchService] = useState("");

  const fetchNurses = async (location = "", service = "") => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (location.trim()) query.append("location", location.trim());
      if (service.trim()) query.append("service", service.trim());

      const res = await fetchWithTimeout(`${API_BASE}/api/nurses/approved?${query.toString()}`);
      const data = await res.json();

      if (res.ok) {
        const safeData = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        setNurses(safeData);

        if (!location && !service) {
          setAllNurses(safeData);
        }
      } else {
        setError(data?.message || "Unable to load nurses. Please try again.");
        setNurses([]);
      }
    } catch (error) {
      setError("Unable to load nurses. Please try again.");
      setNurses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurses();
  }, []);

  const allServices = useMemo(() => {
    const services = new Set<string>();
    allNurses.forEach((nurse) => {
      if (Array.isArray(nurse.services)) {
        nurse.services.forEach((service: string) => {
          if (service?.trim()) services.add(service);
        });
      }
    });
    return Array.from(services);
  }, [allNurses]);

  const handleSearch = () => {
    fetchNurses(searchLocation, searchService);
  };

  const getStartingPrice = (servicePrices: any) => {
    if (!servicePrices) return null;

    if (typeof servicePrices === "object") {
      const values = Object.values(servicePrices)
        .map((value: any) => Number(value))
        .filter((value) => !isNaN(value) && value > 0);

      if (values.length > 0) {
        return Math.min(...values);
      }
    }

    return null;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 px-6 py-10 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Browse Verified Nurses
          </h1>
          <p className="text-slate-500 mt-3 max-w-2xl">
            Discover approved professionals based on your location, care needs,
            and required services.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mb-8">
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search by city / area"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                placeholder="Search by service"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              onClick={handleSearch}
              className="px-8 py-4 rounded-2xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition"
            >
              Search
            </button>
          </div>

          {allServices.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {allServices.slice(0, 12).map((service) => (
                <button
                  key={service}
                  onClick={() => {
                    setSearchService(service);
                    fetchNurses(searchLocation, service);
                  }}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-700 hover:border-teal-300 hover:text-teal-600 transition"
                >
                  {service}
                </button>
              ))}

              <button
                onClick={() => {
                  setSearchLocation("");
                  setSearchService("");
                  fetchNurses("", "");
                }}
                className="px-4 py-2 rounded-full border border-teal-200 bg-teal-50 text-sm text-teal-700 hover:bg-teal-100 transition"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-lg">
            Loading nurses...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : nurses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">
              No approved nurses found
            </h2>
            <p className="text-slate-500 mt-2">
              Try searching with another service or location.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {nurses.map((nurse, index) => {
              const startingPrice = getStartingPrice(nurse.servicePrices);

              return (
                <motion.div
                  key={nurse._id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition p-6"
                >
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
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
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {nurse.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      </div>

                      <p className="text-slate-500 text-sm">
                        {nurse.qualification || "Registered Nurse"}
                      </p>

                      {nurse.experience ? (
                        <p className="text-sm text-slate-500 mt-1">
                          {nurse.experience} year{nurse.experience > 1 ? "s" : ""} experience
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-teal-500" />
                          {nurse.location || "Location not available"}
                        </div>

                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-4 h-4 text-teal-500" />
                          {startingPrice ? `Starts at ₹${startingPrice}` : "Pricing available on profile"}
                        </div>
                      </div>

                      {nurse.bio && (
                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                          {nurse.bio}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(nurse.services || []).slice(0, 5).map((service: string) => (
                          <span
                            key={service}
                            className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            {service}
                          </span>
                        ))}
                      </div>

                      <Link
                        href={`/nurses/${nurse._id}`}
                        className="mt-6 inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition"
                      >
                        View Full Profile
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
