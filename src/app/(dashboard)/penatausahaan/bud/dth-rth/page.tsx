import DthRthView from "@/components/penatausahaan/bud/DthRthView";

export default function DthRthPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          DTH dan RTH (Daftar & Rekapitulasi Transaksi Harian)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Daftar Transaksi Harian belanja SP2D dan Rekapitulasi Transaksi Harian pemotongan pajak daerah (KPPN / e-Billing)
        </p>
      </div>
      <DthRthView />
    </div>
  );
}

