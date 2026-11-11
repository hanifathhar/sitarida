import BkuView from "@/components/penatausahaan/bud/BkuView";

export default function BkuPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Buku Kas Umum Daerah (BKU BUD)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Semua transaksi mutasi penerimaan daerah dan pengeluaran belanja daerah yang terhubung ke Rekening Kas Umum Daerah
        </p>
      </div>
      <BkuView />
    </div>
  );
}

