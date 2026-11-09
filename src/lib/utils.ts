import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "Rp 0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatAngka(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatTanggal(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function terbilang(n: number): string {
  const angka = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  const num = Math.floor(Math.abs(n));
  if (num === 0) return "Nol";
  if (num < 12) return angka[num];
  if (num < 20) return (terbilang(num - 10) + " Belas").trim();
  if (num < 100)
    return (
      terbilang(Math.floor(num / 10)) +
      " Puluh " +
      (num % 10 !== 0 ? terbilang(num % 10) : "")
    ).trim();
  if (num < 200) return ("Seratus " + terbilang(num - 100)).trim();
  if (num < 1000)
    return (
      terbilang(Math.floor(num / 100)) +
      " Ratus " +
      (num % 100 !== 0 ? terbilang(num % 100) : "")
    ).trim();
  if (num < 2000) return ("Seribu " + terbilang(num - 1000)).trim();
  if (num < 1000000)
    return (
      terbilang(Math.floor(num / 1000)) +
      " Ribu " +
      (num % 1000 !== 0 ? terbilang(num % 1000) : "")
    ).trim();
  if (num < 1000000000)
    return (
      terbilang(Math.floor(num / 1000000)) +
      " Juta " +
      (num % 1000000 !== 0 ? terbilang(num % 1000000) : "")
    ).trim();
  if (num < 1000000000000)
    return (
      terbilang(Math.floor(num / 1000000000)) +
      " Miliar " +
      (num % 1000000000 !== 0 ? terbilang(num % 1000000000) : "")
    ).trim();
  if (num < 1000000000000000)
    return (
      terbilang(Math.floor(num / 1000000000000)) +
      " Triliun " +
      (num % 1000000000000 !== 0 ? terbilang(num % 1000000000000) : "")
    ).trim();
  return "";
}

