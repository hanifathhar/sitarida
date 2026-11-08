"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownPosition?: "auto" | "top" | "bottom";
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Pilih Data --",
  searchPlaceholder = "Ketik kode atau nama untuk mencari...",
  emptyText = "Data tidak ditemukan.",
  allowClear = true,
  clearLabel,
  disabled = false,
  required = false,
  className = "",
  dropdownPosition = "auto",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 20);

      // Smart position check: auto detect if dropdown should open upwards
      if (containerRef.current) {
        if (dropdownPosition === "top") {
          setOpenUpwards(true);
        } else if (dropdownPosition === "bottom") {
          setOpenUpwards(false);
        } else {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 300 && rect.top > spaceBelow) {
            setOpenUpwards(true);
          } else {
            setOpenUpwards(false);
          }
        }
      }
    } else {
      setQuery("");
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, dropdownPosition]);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  const maxDisplay = 100;
  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, maxDisplay);
  }, [filteredOptions]);

  return (
    <div ref={containerRef} className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      {/* Hidden native input for HTML5 form required validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, height: 0, width: 0, position: "absolute", pointerEvents: "none" }}
          value={value}
          onChange={() => {}}
          required
        />
      )}

      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm bg-white flex items-center justify-between gap-2.5 transition select-none ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : open
              ? "border-[#991B1B] ring-2 ring-[#991B1B]/20 cursor-pointer shadow-sm"
              : "border-slate-300 hover:border-slate-400 cursor-pointer"
        }`}
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1 py-0.5">
          {selectedOption ? (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 min-w-0 flex-1">
              {selectedOption.badge && (
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold shrink-0 border self-start ${
                    selectedOption.badgeColor || "bg-red-50 text-[#991B1B] border-red-200"
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              <span className="text-slate-900 font-semibold text-xs sm:text-sm leading-snug break-words">
                {selectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs sm:text-sm truncate">
              {clearLabel || placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 self-center">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              title="Reset pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
              open ? "rotate-180 text-[#991B1B]" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={`absolute z-50 w-full min-w-full sm:min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
            openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {/* Search Input Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setOpen(false);
                  } else if (e.key === "Enter" && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {allowClear && clearLabel && !query && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                  value === ""
                    ? "bg-red-50/80 text-[#991B1B] font-bold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{clearLabel}</span>
                {value === "" && <Check className="w-4 h-4 text-[#991B1B] shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-start justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-red-50/90 text-[#991B1B] font-semibold"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {opt.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-semibold shrink-0 border ${
                            isSelected
                              ? "bg-[#991B1B] text-white border-[#991B1B]"
                              : opt.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="leading-snug break-words font-medium text-slate-800">{opt.label}</div>
                        {opt.subLabel && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.subLabel}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer info */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {filteredOptions.length > maxDisplay ? (
                <span>
                  Menampilkan <b>{maxDisplay}</b> dari <b>{filteredOptions.length}</b> hasil (gunakan cari untuk spesifik)
                </span>
              ) : (
                <span>
                  Menampilkan <b>{filteredOptions.length}</b> pilihan
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">ESC untuk tutup</span>
          </div>
        </div>
      )}
    </div>
  );
}

