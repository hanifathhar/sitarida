import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalSp2dPage() {
  return (
    <PostingJurnalView
      jenis="sp2d"
      title="Jurnal SP2D"
      subtitle="Posting jurnal akuntansi atas dokumen Surat Perintah Pencairan Dana (SP2D)"
      sourceLabel="trhsp2d"
    />
  );
}
