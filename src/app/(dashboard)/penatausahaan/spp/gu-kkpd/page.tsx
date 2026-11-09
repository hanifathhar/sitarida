import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppGuKkpdPage() {
  return (
    <SppManagementView
      jenisSpp="GU_KKPD"
      title="Surat Permintaan Pembayaran - Ganti Uang KKPD (SPP-GU KKPD)"
      subtitle="Penggantian tagihan transaksi belanja kartu kredit pemerintah daerah yang telah diverifikasi dan disahkan"
      badgeLabel="SPP-GU KKPD"
      badgeColor="bg-violet-100 text-violet-900 border-violet-200"
    />
  );
}

