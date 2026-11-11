import PenerimaanView from "@/components/penatausahaan/bud/PenerimaanView";

export default function PenerimaanPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Penerimaan Kas Daerah (BUD)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Pencatatan Surat Tanda Setoran (STS) dan penerimaan kas masuk Rekening Kas Umum Daerah (RKUD)
        </p>
      </div>
      <PenerimaanView />
    </div>
  );
}

