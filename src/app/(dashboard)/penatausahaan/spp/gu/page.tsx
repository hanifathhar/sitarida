import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppGuPage() {
  return (
    <SppManagementView
      jenisSpp="GU"
      title="Surat Permintaan Pembayaran - Ganti Uang (SPP-GU)"
      subtitle="Penggantian Uang Persediaan atas realisasi belanja operasional tunai yang telah dipertanggungjawabkan (SPJ)"
      badgeLabel="SPP-GU"
      badgeColor="bg-amber-100 text-amber-900 border-amber-200"
    />
  );
}

