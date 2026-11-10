import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmGuKkpdPage() {
  return (
    <SpmManagementView
      jenisSpm="GU_KKPD"
      title="Surat Perintah Membayar - Ganti Uang Kartu Kredit Pemerintah Daerah (SPM-GU KKPD)"
      subtitle="Penerbitan dokumen SPM Penggantian Belanja atas Tagihan Pembayaran Kartu Kredit Daerah berdasarkan SPP-GU KKPD"
      badgeLabel="SPM-GU KKPD"
      badgeColor="bg-cyan-100 text-cyan-800 border-cyan-200"
    />
  );
}

