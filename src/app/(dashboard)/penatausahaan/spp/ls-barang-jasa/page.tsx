import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppLsBarangJasaPage() {
  return (
    <SppManagementView
      jenisSpp="LS_BARANG_JASA"
      title="Surat Permintaan Pembayaran - Langsung Barang & Jasa (SPP-LS Barjas)"
      subtitle="Pembayaran langsung atas pengadaan barang, jasa, modal, dan kontrak rekanan pihak ketiga"
      badgeLabel="SPP-LS Barjas"
      badgeColor="bg-blue-100 text-blue-900 border-blue-200"
    />
  );
}

