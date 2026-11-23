import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppGuNihilPage() {
  return (
    <SppManagementView
      jenisSpp="GU_NIHIL"
      title="Surat Permintaan Pembayaran - GU Nihil (SPP-GU Nihil)"
      subtitle="Pertanggungjawaban Uang Persediaan / Ganti Uang (LPJ GU) yang bersifat nihil"
      badgeLabel="SPP-GU NIHIL"
      badgeColor="bg-cyan-100 text-cyan-900 border-cyan-200"
    />
  );
}
