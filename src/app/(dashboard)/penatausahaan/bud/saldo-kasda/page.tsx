import SaldoKasdaView from "@/components/penatausahaan/bud/SaldoKasdaView";

export default function SaldoKasdaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Saldo Kasda (Bendahara Umum Daerah)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Pengelolaan Saldo Awal Kas Daerah (RKUD) per Tahun Anggaran yang terhubung langsung ke Buku Kas Umum Daerah (BKU BUD)
        </p>
      </div>
      <SaldoKasdaView />
    </div>
  );
}
