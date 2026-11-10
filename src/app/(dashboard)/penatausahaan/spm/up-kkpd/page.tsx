import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmUpKkpdPage() {
  return (
    <SpmManagementView
      jenisSpm="UP_KKPD"
      title="Surat Perintah Membayar - Uang Persediaan Kartu Kredit Pemerintah Daerah (SPM-UP KKPD)"
      subtitle="Penerbitan dokumen SPM Batasan Belanja UP KKPD untuk transaksi non-tunai kartu kredit daerah berdasarkan SPP-UP KKPD"
      badgeLabel="SPM-UP KKPD"
      badgeColor="bg-purple-100 text-purple-800 border-purple-200"
    />
  );
}

