import RekapPenerimaanView from "@/components/penatausahaan/bud/RekapPenerimaanView";

export default function RekapPenerimaanPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Rekapitulasi Penerimaan Daerah
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Akumulasi realisasi penerimaan kas daerah per SKPD / OPD, sumber dana, dan rekening pendapatan
        </p>
      </div>
      <RekapPenerimaanView />
    </div>
  );
}

