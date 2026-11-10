import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmTuPage() {
  return (
    <SpmManagementView
      jenisSpm="TU"
      title="Surat Perintah Membayar - Tambah Uang (SPM-TU)"
      subtitle="Penerbitan dokumen SPM Tambah Uang Persediaan untuk kegiatan mendesak dan tidak cukup didanai UP berdasarkan SPP-TU"
      badgeLabel="SPM-TU"
      badgeColor="bg-amber-100 text-amber-800 border-amber-200"
    />
  );
}

