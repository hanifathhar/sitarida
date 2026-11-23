import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppTuNihilPage() {
  return (
    <SppManagementView
      jenisSpp="TU_NIHIL"
      title="Surat Permintaan Pembayaran - TU Nihil (SPP-TU Nihil)"
      subtitle="Pertanggungjawaban Tambah Uang Persediaan (LPJ TU) yang bersifat nihil"
      badgeLabel="SPP-TU NIHIL"
      badgeColor="bg-teal-100 text-teal-900 border-teal-200"
    />
  );
}
