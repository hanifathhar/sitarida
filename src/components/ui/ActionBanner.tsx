"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ActionFeedback {
  type: "success" | "error";
  title?: string;
  message: string;
}

interface ActionBannerProps {
  feedback: ActionFeedback | null;
  onDismiss: () => void;
  autoHideMs?: number;
}

export default function ActionBanner({
  feedback,
  onDismiss,
  autoHideMs = 5000,
}: ActionBannerProps) {
  useEffect(() => {
    if (!feedback || autoHideMs <= 0) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [feedback, autoHideMs, onDismiss]);

  if (!feedback) return null;

  const isSuccess = feedback.type === "success";

  return (
    <>
      {/* Inline Banner di Atas Halaman */}
      <div
        role="alert"
        className={`relative overflow-hidden rounded-xl border px-4 py-3.5 shadow-sm transition-all flex items-start justify-between gap-3 ${
          isSuccess
            ? "bg-emerald-50/95 border-emerald-300 text-emerald-900"
            : "bg-red-50/95 border-red-300 text-red-900"
        }`}
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            isSuccess ? "bg-emerald-600" : "bg-[#DC2626]"
          }`}
        />
        <div className="flex items-start gap-3 pl-1.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isSuccess
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-red-100 text-[#DC2626] border border-red-200"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider">
              {feedback.title || (isSuccess ? "Aksi Berhasil" : "Aksi Gagal")}
            </p>
            <p className="text-xs font-medium mt-0.5 break-words leading-relaxed">
              {feedback.message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
            isSuccess
              ? "text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-100"
              : "text-red-700/70 hover:text-red-900 hover:bg-red-100"
          }`}
          title="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Toast Pojok Kanan Atas */}
      <div className="fixed top-4 right-4 z-[70] max-w-sm w-full pointer-events-none">
        <div
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md flex items-start justify-between gap-3 ${
            isSuccess
              ? "bg-white/95 border-emerald-300 text-slate-900"
              : "bg-white/95 border-red-300 text-slate-900"
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p
                className={`text-xs font-extrabold ${
                  isSuccess ? "text-emerald-800" : "text-[#991B1B]"
                }`}
              >
                {feedback.title || (isSuccess ? "Berhasil" : "Gagal")}
              </p>
              <p className="text-xs text-slate-600 mt-0.5 break-words">
                {feedback.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

