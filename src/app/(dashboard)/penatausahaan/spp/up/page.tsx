import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppUpPage() {
  return (
    <SppManagementView
      jenisSpp="UP"
      title="Surat Permintaan Pembayaran - Uang Persediaan (SPP-UP)"
      subtitle="Penerbitan dokumen SPP Uang Persediaan Tunai untuk operasional awal SKPD sesuai Keputusan Kepala Daerah"
      badgeLabel="SPP-UP"
      badgeColor="bg-rose-100 text-[#88131A] border-rose-200"
    />
  );
}

