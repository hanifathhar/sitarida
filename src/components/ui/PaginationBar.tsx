"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export default function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
      <div className="flex items-center gap-3">
        <span>
          Menampilkan halaman <strong className="text-gray-900">{page}</strong> dari{" "}
          <strong className="text-gray-900">{safeTotalPages}</strong> (Total:{" "}
          <strong className="text-[#991B1B]">{total}</strong> baris data)
        </span>
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span>Baris:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-gray-300 bg-white text-xs font-bold text-gray-800"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 font-semibold text-gray-700"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Sebelumnya</span>
        </button>

        {Array.from({ length: Math.min(5, safeTotalPages) }, (_, idx) => {
          const pageNum = idx + 1;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-7 h-7 rounded font-bold text-xs ${
                page === pageNum
                  ? "bg-[#991B1B] text-white shadow-sm"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 font-semibold text-gray-700"
        >
          <span>Berikutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

