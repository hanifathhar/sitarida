"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  title?: string;
  entityName?: string;
  itemCode?: string;
  itemLabel?: string;
  description?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteDialog({
  open,
  title = "Konfirmasi Hapus Data",
  entityName = "Data",
  itemCode,
  itemLabel,
  description,
  loading = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar Merah CAKRA */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <h3 className="font-extrabold text-sm tracking-wide">{title}</h3>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Dialog */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DC2626] shrink-0 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Apakah Anda yakin ingin menghapus {entityName} ini?
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {description ||
                  "Data yang dihapus tidak dapat dikembalikan dan aktivitas penghapusan ini akan dicatat pada Audit Log sistem."}
              </p>
            </div>
          </div>

          {/* Detail Item yang Akan Dihapus */}
          {(itemCode || itemLabel) && (
            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B]">
                Detail {entityName} yang Akan Dihapus:
              </div>
              <div className="text-xs font-semibold text-slate-900 break-words">
                {itemCode && (
                  <span className="inline-block font-mono font-bold px-2 py-0.5 rounded bg-white text-[#5E0E14] border border-red-200 mr-2">
                    {itemCode}
                  </span>
                )}
                <span>{itemLabel}</span>
              </div>
            </div>
          )}

          {/* Pesan Error (misal terhubung foreign key) */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-xs font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#991B1B] hover:from-[#B91C1C] hover:to-[#7F1D1D] text-white text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{loading ? "Menghapus..." : "Ya, Hapus Data"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

