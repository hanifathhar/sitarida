import PengeluaranView from "@/components/penatausahaan/bud/PengeluaranView";

export default function PengeluaranPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Pengeluaran Daerah (Daftar SP2D Cair)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Daftar Surat Perintah Pencairan Dana (SP2D) yang telah dicairkan oleh Bank Penyalur RKUD
        </p>
      </div>
      <PengeluaranView />
    </div>
  );
}

