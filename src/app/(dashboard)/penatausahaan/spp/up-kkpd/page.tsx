import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppUpKkpdPage() {
  return (
    <SppManagementView
      jenisSpp="UP_KKPD"
      title="Surat Permintaan Pembayaran - Uang Persediaan KKPD (SPP-UP KKPD)"
      subtitle="Penerbitan batas pagu Kartu Kredit Pemerintah Daerah (KKPD) untuk belanja operasional non-tunai SKPD"
      badgeLabel="SPP-UP KKPD"
      badgeColor="bg-purple-100 text-purple-900 border-purple-200"
    />
  );
}

