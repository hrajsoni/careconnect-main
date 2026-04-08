"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  children,
  downloadUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  downloadUrl?: string | null;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm bg-black/40 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 md:p-6"
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Open / Download"
                  >
                    <Download size={20} />
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                  title="Close"
                >
                  <X size={22} />
                </button>
              </div>

              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}