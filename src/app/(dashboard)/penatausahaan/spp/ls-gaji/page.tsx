import SppManagementView from "@/components/penatausahaan/SppManagementView";

export default function SppLsGajiPage() {
  return (
    <SppManagementView
      jenisSpp="LS_GAJI"
      title="Surat Permintaan Pembayaran - Langsung Gaji & Tunjangan (SPP-LS Gaji)"
      subtitle="Pembayaran belanja langsung gaji, tunjangan ASN, dan penghasilan tetap lainnya langsung ke rekening penerima"
      badgeLabel="SPP-LS Gaji"
      badgeColor="bg-emerald-100 text-emerald-900 border-emerald-200"
    />
  );
}

