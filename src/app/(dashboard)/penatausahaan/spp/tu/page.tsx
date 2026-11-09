import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppTuPage() {
  return (
    <SppManagementView
      jenisSpp="TU"
      title="Surat Permintaan Pembayaran - Tambah Uang (SPP-TU)"
      subtitle="Permintaan tambahan uang persediaan yang bersifat mendesak dan tidak dapat ditunda penggunaannya"
      badgeLabel="SPP-TU"
      badgeColor="bg-orange-100 text-orange-900 border-orange-200"
    />
  );
}

