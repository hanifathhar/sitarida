import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalPenerimaanPage() {
  return (
    <PostingJurnalView
      jenis="penerimaan"
      title="Jurnal Penerimaan"
      subtitle="Posting jurnal akuntansi atas dokumen penerimaan pendapatan daerah"
      sourceLabel=""
    />
  );
}
