import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalSpjPage() {
  return (
    <PostingJurnalView
      jenis="spj"
      title="Jurnal SPJ Pengeluaran"
      subtitle="Posting jurnal akuntansi atas pembukuan SPJ pengeluaran bendahara"
      sourceLabel="trhtransout"
    />
  );
}
