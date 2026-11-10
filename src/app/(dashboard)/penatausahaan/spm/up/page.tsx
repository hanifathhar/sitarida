import SpmManagementView from "@/components/penatausahaan/SpmManagementView";

export default function SpmUpPage() {
  return (
    <SpmManagementView
      jenisSpm="UP"
      title="Surat Perintah Membayar - Uang Persediaan (SPM-UP)"
      subtitle="Penerbitan dokumen SPM Uang Persediaan Tunai untuk operasional awal SKPD berdasarkan dokumen SPP-UP"
      badgeLabel="SPM-UP"
      badgeColor="bg-rose-100 text-[#88131A] border-rose-200"
    />
  );
}

