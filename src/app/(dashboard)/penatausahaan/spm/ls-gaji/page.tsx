import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmLsGajiPage() {
  return (
    <SpmManagementView
      jenisSpm="LS_GAJI"
      title="Surat Perintah Membayar - Langsung Gaji & Tunjangan (SPM-LS Gaji)"
      subtitle="Penerbitan dokumen SPM Pembayaran Langsung Gaji dan Tunjangan ASN / Non-ASN berdasarkan SPP-LS Gaji"
      badgeLabel="SPM-LS Gaji"
      badgeColor="bg-emerald-100 text-emerald-800 border-emerald-200"
    />
  );
}

