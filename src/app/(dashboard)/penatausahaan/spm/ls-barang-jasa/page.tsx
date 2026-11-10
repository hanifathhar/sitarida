import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmLsBarangJasaPage() {
  return (
    <SpmManagementView
      jenisSpm="LS_BARANG_JASA"
      title="Surat Perintah Membayar - Langsung Pengadaan Barang & Jasa (SPM-LS Barang dan Jasa)"
      subtitle="Penerbitan dokumen SPM Pembayaran Langsung kepada Pihak Ketiga Rekanan / Penyedia berdasarkan SPP-LS Barang dan Jasa"
      badgeLabel="SPM-LS Barang dan Jasa"
      badgeColor="bg-indigo-100 text-indigo-800 border-indigo-200"
    />
  );
}

