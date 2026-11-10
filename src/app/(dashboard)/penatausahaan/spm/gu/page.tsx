import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmGuPage() {
  return (
    <SpmManagementView
      jenisSpm="GU"
      title="Surat Perintah Membayar - Ganti Uang (SPM-GU)"
      subtitle="Penerbitan dokumen SPM Ganti Uang Persediaan atas pertanggungjawaban belanja kas SKPD berdasarkan SPP-GU"
      badgeLabel="SPM-GU"
      badgeColor="bg-blue-100 text-blue-800 border-blue-200"
    />
  );
}

