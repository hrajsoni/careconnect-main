"use client";

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileUp,
  FileText,
  UploadCloud,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
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

  throw new Error("Unexpected server response received.");
}

export default function PatientReportsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchReports = async () => {
      const patientId = localStorage.getItem("userId");
    

    if (!patientId) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/reports/patient-reports/${patientId}`,
        {
          credentials: "include",
        }
      );

      if (res.status === 401) {
        clearStoredAuth();
        router.push("/login");
        return;
      }

      const data = await safeParseResponse(res);

      if (res.ok) {
        const reports = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setSavedReports(reports);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const saveReports = async () => {
    const patientId = localStorage.getItem("userId");
    

    if (!patientId) {
      router.push("/login");
      return;
    }

    if (files.length === 0) {
      setMessage({ type: "error", text: "Please choose at least one file." });
      return;
    }

    setLoading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("patientId", patientId);
        formData.append("notes", notes);
        formData.append("report", file);

        const res = await fetchWithTimeout(`${API_BASE}/api/reports/upload-report`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.status === 401) {
          clearStoredAuth();
          router.push("/login");
          return;
        }

        const data = await safeParseResponse(res);

        if (!res.ok) {
          throw new Error(data.error || data.message || "Upload failed");
        }
      }

      setFiles([]);
      setNotes("");
      setMessage({ type: "success", text: "Reports uploaded successfully." });
      fetchReports();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to upload reports." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Medical Reports
              </h1>
              <p className="text-slate-500 mt-2">
                Upload reports and health notes to help nurses understand your care needs better.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                  <FileUp className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Upload Reports
                  </h2>
                  <p className="text-slate-500">
                    Add prescriptions, lab reports, discharge summaries, or relevant medical records.
                  </p>
                </div>
              </div>

              <label className="border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                <UploadCloud className="w-10 h-10 text-teal-500 mb-4" />
                <p className="font-semibold text-slate-700">Click to upload files</p>
                <p className="text-sm text-slate-500 mt-2">
                  PDF, JPG, PNG, or scanned reports
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <FileText className="w-5 h-5 text-teal-600" />
                      <span className="text-sm font-medium text-slate-700">
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any important medical history, current condition, allergies, or care instructions..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  onClick={saveReports}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                >
                  {loading ? "Uploading..." : "Save Reports"}
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Uploaded Reports
              </h2>

              {savedReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400">
                  No reports uploaded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {savedReports.map((report) => (
                    <div
                      key={report._id}
                      className="rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {report.originalName}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {report.notes || "No notes added"}
                        </p>
                      </div>

                      <a
                        href={`${API_BASE}/${report.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 font-semibold hover:underline"
                      >
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
