import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalPenetapanPage() {
  return (
    <PostingJurnalView
      jenis="penetapan"
      title="Jurnal Penetapan"
      subtitle="Posting jurnal akuntansi atas dokumen penetapan pendapatan daerah"
      sourceLabel="tbl_penetapan"
    />
  );
}
