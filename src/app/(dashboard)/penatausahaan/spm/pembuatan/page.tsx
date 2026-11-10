import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function PembuatanSpmPage() {
  return (
    <SpmManagementView
      jenisSpm="ALL"
      title="Pembuatan Surat Perintah Membayar (SPM)"
      subtitle="Penerbitan dokumen SPM atas beban pengeluaran (UP, GU, TU, LS Gaji, LS Barang dan Jasa) berdasarkan dokumen SPP yang telah diterbitkan"
      badgeLabel="SPM"
      badgeColor="bg-rose-100 text-[#88131A] border-rose-200"
    />
  );
}

