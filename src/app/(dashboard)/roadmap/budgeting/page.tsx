import React from "react";
import Link from "next/link";
import { CheckCircle2, FileSpreadsheet, ArrowLeft } from "lucide-react";

export default function RoadmapBudgetingPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold mb-3">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Kesiapan Skema Database & Arsitektur untuk Sprint Berikutnya</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          Modul Perencanaan & Penganggaran (Sprint 4 – Sprint 9)
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
          Sesuai kesepakatan pengembangan bertahap per Sprint, saat ini fokus implementasi aktif
          berada pada <strong>Sprint 1–3 (Fondasi, RBAC, Perangkat Daerah & Master Data)</strong>.
          Seluruh tabel database untuk Sprint 4–9 telah dibuat di PostgreSQL (`dbsitarida`) dengan
          aturan bisnis yang sudah dikunci:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sprint 4: KUA-PPAS & Pagu Total OPD</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Tabel <code>KuaPpas</code> dan <code>KuaPpasDetail</code> telah siap menyimpan plafon
              Pendapatan, Belanja, dan Pembiayaan yang dikunci pada level{" "}
              <strong>Total OPD</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sprint 5–7: RKA-SKPD & Workflow 2 Tahap</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Tabel <code>Rka</code>, <code>RkaSubkegiatan</code>, <code>RkaDetail</code>, dan{" "}
              <code>WorkflowInstance</code> telah siap mendukung rincian Belanja Subkegiatan dan
              alur 2 tahap (<strong>Admin/PPTK OPD → TAPD/BPKPAD</strong>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sprint 8–9: Konsolidasi APBD & DPA</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Tabel <code>Apbd</code>, <code>ApbdDetail</code>, <code>Dpa</code>, dan{" "}
              <code>DpaDetail</code> siap mengonsolidasikan RKA yang disetujui menjadi Perda APBD
              dan DPA-SKPD.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Sprint 1–3</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

