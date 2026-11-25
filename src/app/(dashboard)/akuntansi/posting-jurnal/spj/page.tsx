import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalSpjPage() {
  return (
    <PostingJurnalView
      jenis="spj"
      title="Jurnal SPJ UP/GU/TU"
      subtitle="Posting jurnal akuntansi atas pembukuan SPJ UP/GU/TU bendahara pengeluaran"
      sourceLabel="trhtransout"
    />
  );
}
