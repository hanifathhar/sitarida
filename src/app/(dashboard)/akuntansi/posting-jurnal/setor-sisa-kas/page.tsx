import PostingJurnalView from "@/components/akuntansi/PostingJurnalView";

export default function JurnalSetorSisaKasPage() {
  return (
    <PostingJurnalView
      jenis="setor-sisa-kas"
      title="Jurnal Setor Sisa Kas / Pengembalian"
      subtitle="Posting jurnal akuntansi atas setoran sisa kas UP/GU/TU dan pengembalian belanja"
      sourceLabel="trhkasin (SISA_KAS_UP_GU_TU & PENGEMBALIAN_BELANJA)"
    />
  );
}
