import RekapPengeluaranView from "@/components/penatausahaan/bud/RekapPengeluaranView";

export default function RekapPengeluaranPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Rekapitulasi Pengeluaran Daerah
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Akumulasi realisasi pencairan dana SP2D per jenis belanja (UP, GU, TU, LS) dan per Perangkat Daerah
        </p>
      </div>
      <RekapPengeluaranView />
    </div>
  );
}

