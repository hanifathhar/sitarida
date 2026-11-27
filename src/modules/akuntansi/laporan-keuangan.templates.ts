export type JenisLaporanKeuangan = "LRA" | "LO" | "NERACA";

export interface MappingTemplateRow {
  urutan: number;
  kodeBaris: string;
  uraian: string;
  tipeBaris: "HEADER" | "DETAIL" | "SUBTOTAL" | "TOTAL" | "SPACER";
  level: number;
  kodeRekening: string | null;
  posisiNormal: "AUTO" | "DEBET" | "KREDIT" | "MINUS_DEBET" | "MINUS_KREDIT";
  formula: string | null;
  isBold: boolean;
}

export const LRA_DEFAULT_TEMPLATE: MappingTemplateRow[] = [
  { urutan: 10, kodeBaris: "4", uraian: "PENDAPATAN", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.1+4.2+4.3", isBold: true },
  { urutan: 20, kodeBaris: "4.1", uraian: "PENDAPATAN ASLI DAERAH", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.1.01+4.1.02+4.1.03+4.1.04", isBold: true },
  { urutan: 30, kodeBaris: "4.1.01", uraian: "Pendapatan Pajak Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.1.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 40, kodeBaris: "4.1.02", uraian: "Pendapatan Retribusi Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.1.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 50, kodeBaris: "4.1.03", uraian: "Pendapatan Hasil Pengelolaan Kekayaan Daerah yang Dipisahkan", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.1.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 60, kodeBaris: "4.1.04", uraian: "Lain-lain PAD yang Sah", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.1.04", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 70, kodeBaris: "4.2", uraian: "PENDAPATAN TRANSFER", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.2.01+4.2.02+4.2.03", isBold: true },
  { urutan: 80, kodeBaris: "4.2.01", uraian: "PENDAPATAN TRANSFER PEMERINTAH PUSAT - DANA PERIMBANGAN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.2.01.01+4.2.01.03+4.2.01.04+4.2.01.05", isBold: true },
  { urutan: 90, kodeBaris: "4.2.01.01", uraian: "Dana Bagi Hasil", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.01.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 100, kodeBaris: "4.2.01.03", uraian: "Dana Alokasi Umum", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.01.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 110, kodeBaris: "4.2.01.04", uraian: "Dana Alokasi Khusus - Fisik", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.01.04", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 120, kodeBaris: "4.2.01.05", uraian: "Dana Alokasi Khusus - Non Fisik", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.01.05", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 130, kodeBaris: "4.2.02", uraian: "TRANSFER PEMERINTAH PUSAT - LAINNYA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.2.02.01+4.2.02.02+4.2.02.03+4.2.02.04", isBold: true },
  { urutan: 140, kodeBaris: "4.2.02.01", uraian: "Dana Insentif Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.02.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 150, kodeBaris: "4.2.02.02", uraian: "Dana Otonomi Khusus", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.02.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 160, kodeBaris: "4.2.02.03", uraian: "Dana Keistimewaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.02.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 170, kodeBaris: "4.2.02.04", uraian: "Dana Desa", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.02.04", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 180, kodeBaris: "4.2.03", uraian: "TRANSFER PEMERINTAH ANTAR DAERAH", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.2.03.01+4.2.03.02", isBold: true },
  { urutan: 190, kodeBaris: "4.2.03.01", uraian: "Pendapatan Bagi Hasil Pajak", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.03.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 200, kodeBaris: "4.2.03.02", uraian: "Bantuan Keuangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.2.03.02", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 210, kodeBaris: "4.3", uraian: "LAIN-LAIN PENDAPATAN YANG SAH", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "4.3.01+4.3.02+4.3.03", isBold: true },
  { urutan: 220, kodeBaris: "4.3.01", uraian: "Pendapatan Hibah", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.3.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 230, kodeBaris: "4.3.02", uraian: "Pendapatan Dana Darurat", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.3.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 240, kodeBaris: "4.3.03", uraian: "Lain-lain Pendapatan Sesuai dengan Ketentuan Peraturan Perundang-Undangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "4.3.03", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 250, kodeBaris: "", uraian: "JUMLAH PENDAPATAN", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "4", isBold: true },

  { urutan: 260, kodeBaris: "5", uraian: "BELANJA", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "DEBET", formula: "5.1+5.2+5.3+5.4", isBold: true },
  { urutan: 270, kodeBaris: "5.1", uraian: "BELANJA OPERASI", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "5.1.01+5.1.02+5.1.03+5.1.04+5.1.05+5.1.06", isBold: true },
  { urutan: 280, kodeBaris: "5.1.01", uraian: "Belanja Pegawai", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 290, kodeBaris: "5.1.02", uraian: "Belanja Barang", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 300, kodeBaris: "5.1.03", uraian: "Bunga", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 310, kodeBaris: "5.1.04", uraian: "Subsidi", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 320, kodeBaris: "5.1.05", uraian: "Hibah", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 330, kodeBaris: "5.1.06", uraian: "Bantuan Sosial", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.1.06", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 340, kodeBaris: "5.2", uraian: "BELANJA MODAL", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "5.2.01+5.2.02+5.2.03+5.2.04+5.2.05+5.2.06", isBold: true },
  { urutan: 350, kodeBaris: "5.2.01", uraian: "Belanja Tanah", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 360, kodeBaris: "5.2.02", uraian: "Belanja Peralatan dan Mesin", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 370, kodeBaris: "5.2.03", uraian: "Belanja Gedung dan Bangunan", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 380, kodeBaris: "5.2.04", uraian: "Belanja Jalan, Irigasi dan Jaringan", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 390, kodeBaris: "5.2.05", uraian: "Belanja Aset Tetap Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 400, kodeBaris: "5.2.06", uraian: "Belanja Aset Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.2.06", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 410, kodeBaris: "5.3", uraian: "BELANJA TAK TERDUGA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "5.3.01", isBold: true },
  { urutan: 420, kodeBaris: "5.3.01", uraian: "Belanja Tak Terduga", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.3.01", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 430, kodeBaris: "5.4", uraian: "BELANJA TRANSFER", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "5.4.01+5.4.02+5.4.03+5.4.04+5.4.05", isBold: true },
  { urutan: 440, kodeBaris: "5.4.01", uraian: "Belanja Bagi Hasil Pajak Daerah Kepada Pemerintahan Kabupaten/Kota dan Desa", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.4.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 450, kodeBaris: "5.4.02", uraian: "Belanja Bantuan Keuangan antar Daerah Provinsi", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.4.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 460, kodeBaris: "5.4.03", uraian: "Belanja Bantuan Keuangan Daerah Provinsi ke Kabupaten/Kota", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.4.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 470, kodeBaris: "5.4.04", uraian: "Belanja Bantuan Keuangan Daerah Provinsi atau Kabupaten/Kota Kepada Desa", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.4.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 480, kodeBaris: "5.4.05", uraian: "Belanja Transfer Dana Otonomi Khusus Provinsi Kepada Kabupaten/Kota", tipeBaris: "DETAIL", level: 3, kodeRekening: "5.4.05", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 490, kodeBaris: "", uraian: "JUMLAH BELANJA", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "5", isBold: true },
  { urutan: 500, kodeBaris: "", uraian: "SURPLUS/(DEFISIT)", tipeBaris: "TOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "4-5", isBold: true },

  { urutan: 510, kodeBaris: "6", uraian: "PEMBIAYAAN", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: null, isBold: true },
  { urutan: 520, kodeBaris: "6.1", uraian: "PENERIMAAN PEMBIAYAAN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "6.1.1.1+6.1.1.2+6.1.1.3+6.1.1.4+6.1.1.5+6.1.1.6+6.1.1.7+6.1.1.8+6.1.1.9+6.1.1.10+6.1.1.11+6.1.1.12+6.1.1.13", isBold: true },
  { urutan: 530, kodeBaris: "6.1.1.1", uraian: "Penggunaan SiLPA", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 540, kodeBaris: "6.1.1.2", uraian: "Pencairan Dana Cadangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 550, kodeBaris: "6.1.1.3", uraian: "Hasil Penjualan Kekayaan Daerah yang Dipisahkan", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 560, kodeBaris: "6.1.1.4", uraian: "Pinjaman Dalam Negeri - Pemerintah Pusat", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 570, kodeBaris: "6.1.1.5", uraian: "Pinjaman Dalam Negeri - Pemerintah Daerah Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 580, kodeBaris: "6.1.1.6", uraian: "Pinjaman Dalam Negeri - Lembaga Keuangan Bank", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 590, kodeBaris: "6.1.1.7", uraian: "Pinjaman Dalam Negeri - Lembaga Keuangan Bukan Bank", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.04", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 600, kodeBaris: "6.1.1.8", uraian: "Pinjaman Dalam Negeri - Obligasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.05", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 610, kodeBaris: "6.1.1.9", uraian: "Pinjaman Dalam Negeri - Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.04.06", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 620, kodeBaris: "6.1.1.10", uraian: "Penerimaan Kembali Pinjaman kepada Perusahaan Negara", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.05.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 630, kodeBaris: "6.1.1.11", uraian: "Penerimaan Kembali Pinjaman kepada Perusahaan Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.05.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 640, kodeBaris: "6.1.1.12", uraian: "Penerimaan Kembali Pinjaman kepada Pemerintah Daerah Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.05.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 650, kodeBaris: "6.1.1.13", uraian: "Koreksi SILPA", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.1.06", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 660, kodeBaris: "6.2", uraian: "PENGELUARAN PEMBIAYAAN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "6.2.2.1+6.2.2.2+6.2.2.3+6.2.2.4+6.2.2.5+6.2.2.6+6.2.2.7+6.2.2.8+6.2.2.9+6.2.2.10+6.2.2.11+6.2.2.12", isBold: true },
  { urutan: 670, kodeBaris: "6.2.2.1", uraian: "Pembentukan Dana Cadangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 680, kodeBaris: "6.2.2.2", uraian: "Penyertaan Modal Pemerintah Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 690, kodeBaris: "6.2.2.3", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Pemerintah Pusat", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 700, kodeBaris: "6.2.2.4", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Pemerintah Daerah Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 710, kodeBaris: "6.2.2.5", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Lembaga Keuangan Bank", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 720, kodeBaris: "6.2.2.6", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Lembaga Keuangan Bukan Bank", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 730, kodeBaris: "6.2.2.7", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Obligasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 740, kodeBaris: "6.2.2.8", uraian: "Pembayaran Pokok Pinjaman Dalam Negeri - Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.03.06", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 750, kodeBaris: "6.2.2.9", uraian: "Pemberian Pinjaman kepada Perusahaan Negara", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.04.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 760, kodeBaris: "6.2.2.10", uraian: "Pemberian Pinjaman kepada Perusahaan Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.04.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 770, kodeBaris: "6.2.2.11", uraian: "Pemberian Pinjaman kepada Pemerintah Daerah Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.04.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 780, kodeBaris: "6.2.2.12", uraian: "Pemberian Pinjaman Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "6.2.04.04", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 790, kodeBaris: "", uraian: "PEMBIAYAAN NETTO", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "6.1-6.2", isBold: true },
  { urutan: 800, kodeBaris: "", uraian: "SISA/(LEBIH PEMBIAYAAN ANGGARAN)", tipeBaris: "TOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "4-5+6.1-6.2", isBold: true },
];

export const LO_DEFAULT_TEMPLATE: MappingTemplateRow[] = [
  { urutan: 10, kodeBaris: "7", uraian: "PENDAPATAN", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.1+7.2+7.3", isBold: true },
  { urutan: 20, kodeBaris: "7.1", uraian: "PENDAPATAN ASLI DAERAH", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.1.1+7.1.2+7.1.3+7.1.4", isBold: true },
  { urutan: 30, kodeBaris: "7.1.1", uraian: "Pendapatan Pajak Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.1.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 40, kodeBaris: "7.1.2", uraian: "Pendapatan Retribusi Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.1.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 50, kodeBaris: "7.1.3", uraian: "Pendapatan Hasil Pengelolaan Kekayaan Daerah yang Dipisahkan", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.1.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 60, kodeBaris: "7.1.4", uraian: "Lain-lain PAD yang Sah", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.1.04", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 70, kodeBaris: "7.2", uraian: "PENDAPATAN TRANSFER", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.2.1+7.2.2+7.2.3", isBold: true },
  { urutan: 80, kodeBaris: "7.2.1", uraian: "TRANSFER PEMERINTAH PUSAT - DANA PERIMBANGAN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.2.1.1+7.2.1.2+7.2.1.3+7.2.1.4", isBold: true },
  { urutan: 90, kodeBaris: "7.2.1.1", uraian: "Dana Bagi Hasil", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.01.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 100, kodeBaris: "7.2.1.2", uraian: "Dana Alokasi Umum", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.01.02,7.2.01.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 110, kodeBaris: "7.2.1.3", uraian: "Dana Alokasi Khusus - Fisik", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.01.04", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 120, kodeBaris: "7.2.1.4", uraian: "Dana Alokasi Khusus - Non Fisik", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.01.05", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 130, kodeBaris: "7.2.2", uraian: "TRANSFER PEMERINTAH PUSAT LAINNYA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.2.2.1+7.2.2.2", isBold: true },
  { urutan: 140, kodeBaris: "7.2.2.1", uraian: "Dana Insentif Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.02.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 150, kodeBaris: "7.2.2.2", uraian: "Dana Desa", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.02.04", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 160, kodeBaris: "7.2.3", uraian: "TRANSFER PEMERINTAH PROVINSI", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.2.3.1+7.2.3.2", isBold: true },
  { urutan: 170, kodeBaris: "7.2.3.1", uraian: "Pendapatan Bagi Hasil Pajak", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.03.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 180, kodeBaris: "7.2.3.2", uraian: "Bantuan Keuangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.2.03.02", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 190, kodeBaris: "7.3", uraian: "LAIN-LAIN PENDAPATAN YANG SAH", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "7.3.1+7.3.2+7.3.3+7.3.4+7.3.5", isBold: true },
  { urutan: 200, kodeBaris: "7.3.1", uraian: "Pendapatan Hibah", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.3.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 210, kodeBaris: "7.3.2", uraian: "Pendapatan Dana Darurat", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.3.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 220, kodeBaris: "7.3.3", uraian: "Lain-lain Pendapatan Sesuai dengan Ketentuan Peraturan Perundang-undangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.3.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 230, kodeBaris: "7.3.4", uraian: "Bonus Produksi Dari Pengusahaan Panas Bumi", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.3.04", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 240, kodeBaris: "7.3.5", uraian: "Dana Desa", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.3.05", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 250, kodeBaris: "", uraian: "JUMLAH PENDAPATAN", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "7", isBold: true },

  { urutan: 260, kodeBaris: "8", uraian: "BEBAN", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "DEBET", formula: "8.1.1+8.1.2+8.1.3+8.1.4+8.1.5+8.1.6+8.1.7+8.1.8+8.1.9+8.1.10+8.1.11+8.1.12+8.1.13+8.1.14", isBold: true },
  { urutan: 270, kodeBaris: "8.1.1", uraian: "Beban Pegawai", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 280, kodeBaris: "8.1.2", uraian: "Beban Persediaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 290, kodeBaris: "8.1.3", uraian: "Beban Jasa", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.02.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 300, kodeBaris: "8.1.4", uraian: "Beban Pemeliharaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.02.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 310, kodeBaris: "8.1.5", uraian: "Beban Perjalanan Dinas", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.02.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 320, kodeBaris: "8.1.6", uraian: "Beban Bunga", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 330, kodeBaris: "8.1.7", uraian: "Beban Subsidi", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 340, kodeBaris: "8.1.8", uraian: "Beban Hibah", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 350, kodeBaris: "8.1.9", uraian: "Beban Bantuan Sosial", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.06", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 360, kodeBaris: "8.1.10", uraian: "Beban Penyisihan Piutang", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.07", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 370, kodeBaris: "8.1.11", uraian: "Beban Penyusutan", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.08", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 380, kodeBaris: "8.1.12", uraian: "Beban Amortisasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.09", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 390, kodeBaris: "8.1.13", uraian: "Beban Transfer", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.2", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 400, kodeBaris: "8.1.14", uraian: "Beban Lain-lain", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.1.10", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 410, kodeBaris: "", uraian: "JUMLAH BEBAN", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "8", isBold: true },
  { urutan: 420, kodeBaris: "OP_SURPLUS", uraian: "JUMLAH SURPLUS/(DEFISIT DARI OPERASI)", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "7-8", isBold: true },

  { urutan: 430, kodeBaris: "8.4", uraian: "SURPLUS/DEFISIT DARI KEGIATAN NON OPERASIONAL", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "AUTO", formula: "8.4.1+8.4.2-8.4.3-8.4.4+8.4.5", isBold: true },
  { urutan: 440, kodeBaris: "8.4.1", uraian: "Surplus Penjualan Aset Nonlancar", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.4.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 450, kodeBaris: "8.4.2", uraian: "Surplus Penyelesaian Kewajiban Jangka Panjang", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.4.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 460, kodeBaris: "8.4.3", uraian: "Defisit Penjualan Aset Nonlancar", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.3.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 470, kodeBaris: "8.4.4", uraian: "Defisit Penyelesaian Kewajiban Jangka Panjang", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.3.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 480, kodeBaris: "8.4.5", uraian: "Surplus/Defisit dari Kegiatan Non Operasional Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.4.03,8.3.03", posisiNormal: "AUTO", formula: null, isBold: false },

  { urutan: 490, kodeBaris: "", uraian: "JUMLAH SURPLUS/(DEFISIT DARI KEGIATAN NON OPERASIONAL)", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "8.4", isBold: true },
  { urutan: 500, kodeBaris: "", uraian: "SURPLUS/(DEFISIT SEBELUM POS LUAR BIASA)", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "7-8+8.4", isBold: true },

  { urutan: 510, kodeBaris: "8.5", uraian: "PENDAPATAN LUAR BIASA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "8.5.1", isBold: true },
  { urutan: 520, kodeBaris: "8.5.1", uraian: "Pendapatan Luar Biasa", tipeBaris: "DETAIL", level: 3, kodeRekening: "7.5", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 530, kodeBaris: "8.6", uraian: "BEBAN LUAR BIASA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "8.6.1", isBold: true },
  { urutan: 540, kodeBaris: "8.6.1", uraian: "Beban Luar Biasa", tipeBaris: "DETAIL", level: 3, kodeRekening: "8.4,8.5", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 550, kodeBaris: "POS_LB", uraian: "POS LUAR BIASA", tipeBaris: "SUBTOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "8.5-8.6", isBold: true },
  { urutan: 560, kodeBaris: "", uraian: "SURPLUS/(DEFISIT - LO)", tipeBaris: "TOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "7-8+8.4+8.5-8.6", isBold: true },
];

export const NERACA_DEFAULT_TEMPLATE: MappingTemplateRow[] = [
  { urutan: 10, kodeBaris: "1", uraian: "ASET", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "DEBET", formula: null, isBold: true },
  { urutan: 20, kodeBaris: "1.1", uraian: "ASET LANCAR", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.1.01+1.1.02+1.1.03+1.1.04+1.1.05+1.1.06+1.1.07+1.1.08+1.1.09+1.1.10+1.1.11+1.1.12+1.1.13+1.1.14+1.1.15+1.1.16+1.1.17+1.1.18+1.1.19", isBold: true },
  { urutan: 30, kodeBaris: "1.1.01", uraian: "Kas di Kas Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 40, kodeBaris: "1.1.02", uraian: "Kas di Bendahara Pengeluaran", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 50, kodeBaris: "1.1.03", uraian: "Kas di Bendahara Penerimaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 60, kodeBaris: "1.1.04", uraian: "Kas BOS", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 70, kodeBaris: "1.1.05", uraian: "Kas JKN", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.06", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 80, kodeBaris: "1.1.06", uraian: "Kas Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.01.07,1.1.01.10", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 90, kodeBaris: "1.1.07", uraian: "Investasi Jangka Pendek", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 100, kodeBaris: "1.1.08", uraian: "Piutang Pajak", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 110, kodeBaris: "1.1.09", uraian: "Piutang Retribusi", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 120, kodeBaris: "1.1.10", uraian: "Piutang Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.05,1.1.06", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 130, kodeBaris: "1.1.11", uraian: "Penyisihan Piutang", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.07", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 140, kodeBaris: "1.1.12", uraian: "Belanja Dibayar Dimuka", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.08", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 150, kodeBaris: "1.1.13", uraian: "Bagian Lancar Pinjaman Kepada Perusahaan Negara", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.09.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 160, kodeBaris: "1.1.14", uraian: "Bagian Lancar Pinjaman Kepada Perusahaan Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.09.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 170, kodeBaris: "1.1.15", uraian: "Bagian Lancar Pinjaman Kepada Pemerintah Pusat", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.09.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 180, kodeBaris: "1.1.16", uraian: "Bagian Lancar Pinjaman Kepada Pemerintah Daerah Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.09.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 190, kodeBaris: "1.1.17", uraian: "Bagian Lancar Tagihan Penjualan Angsuran", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.10", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 200, kodeBaris: "1.1.18", uraian: "Bagian Lancar Tuntutan Ganti Rugi", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.11", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 210, kodeBaris: "1.1.19", uraian: "Persediaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.1.12", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 220, kodeBaris: "1.2", uraian: "INVESTASI JANGKA PANJANG", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.2.1+1.2.2", isBold: true },
  { urutan: 230, kodeBaris: "1.2.1", uraian: "INVESTASI NON PERMANEN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.2.1.1+1.2.1.2+1.2.1.3+1.2.1.4", isBold: true },
  { urutan: 240, kodeBaris: "1.2.1.1", uraian: "Pinjaman Jangka Panjang", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.01.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 250, kodeBaris: "1.2.1.2", uraian: "Investasi Dalam Surat Utang Negara", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.01.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 260, kodeBaris: "1.2.1.3", uraian: "Investasi Dalam Proyek Pembangunan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.01.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 270, kodeBaris: "1.2.1.4", uraian: "Investasi Non Permanen Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.01.04", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 280, kodeBaris: "1.2.2", uraian: "INVESTASI PERMANEN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.2.2.1+1.2.2.2", isBold: true },
  { urutan: 290, kodeBaris: "1.2.2.1", uraian: "Penyertaan Modal Pemerintah Daerah", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.02.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 300, kodeBaris: "1.2.2.2", uraian: "Investasi Permanen Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.2.02.02", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 310, kodeBaris: "1.3", uraian: "ASET TETAP", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.3.01+1.3.02+1.3.03+1.3.04+1.3.05+1.3.06+1.3.07", isBold: true },
  { urutan: 320, kodeBaris: "1.3.01", uraian: "Tanah", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 330, kodeBaris: "1.3.02", uraian: "Peralatan dan Mesin", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 340, kodeBaris: "1.3.03", uraian: "Gedung dan Bangunan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 350, kodeBaris: "1.3.04", uraian: "Jalan, Irigasi dan Jaringan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 360, kodeBaris: "1.3.05", uraian: "Aset Tetap Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 370, kodeBaris: "1.3.06", uraian: "Konstruksi Dalam Pengerjaan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.06", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 380, kodeBaris: "1.3.07", uraian: "Akumulasi Penyusutan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.3.07", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 390, kodeBaris: "1.4", uraian: "DANA CADANGAN", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.4.01", isBold: true },
  { urutan: 400, kodeBaris: "1.4.01", uraian: "Dana Cadangan", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.4", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 410, kodeBaris: "1.5", uraian: "ASET LAINNYA", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "DEBET", formula: "1.5.01+1.5.02+1.5.03+1.5.04+1.5.05+1.5.06", isBold: true },
  { urutan: 420, kodeBaris: "1.5.01", uraian: "Tagihan Penjualan Angsuran", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.01", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 430, kodeBaris: "1.5.02", uraian: "Tuntutan Ganti Rugi", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.02", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 440, kodeBaris: "1.5.03", uraian: "Kemitraan Dengan Pihak Ke Tiga", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.03", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 450, kodeBaris: "1.5.04", uraian: "Aset Tak Berwujud", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.04", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 460, kodeBaris: "1.5.05", uraian: "Akumulasi Amortisasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.05", posisiNormal: "DEBET", formula: null, isBold: false },
  { urutan: 470, kodeBaris: "1.5.06", uraian: "Aset Lain-lain", tipeBaris: "DETAIL", level: 3, kodeRekening: "1.5.06", posisiNormal: "DEBET", formula: null, isBold: false },

  { urutan: 480, kodeBaris: "", uraian: "JUMLAH ASET", tipeBaris: "TOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "1.1+1.2+1.3+1.4+1.5", isBold: true },

  { urutan: 490, kodeBaris: "2", uraian: "KEWAJIBAN", tipeBaris: "HEADER", level: 1, kodeRekening: null, posisiNormal: "KREDIT", formula: "2.1+2.2", isBold: true },
  { urutan: 500, kodeBaris: "2.1", uraian: "KEWAJIBAN JANGKA PENDEK", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "2.1.01+2.1.02+2.1.03+2.1.04+2.1.05+2.1.06", isBold: true },
  { urutan: 510, kodeBaris: "2.1.01", uraian: "Utang Perhitungan Pihak Ketiga (PFK)", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 520, kodeBaris: "2.1.02", uraian: "Utang Bunga", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 530, kodeBaris: "2.1.03", uraian: "Bagian Lancar Utang Jangka Panjang", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 540, kodeBaris: "2.1.04", uraian: "Pendapatan Diterima Dimuka", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.04", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 550, kodeBaris: "2.1.05", uraian: "Utang Belanja", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.05,2.1.06", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 560, kodeBaris: "2.1.06", uraian: "Utang Jangka Pendek Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.1.07,2.1.08", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 570, kodeBaris: "2.2", uraian: "KEWAJIBAN JANGKA PANJANG", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "2.2.01+2.2.02+2.2.03+2.2.04", isBold: true },
  { urutan: 580, kodeBaris: "2.2.01", uraian: "Utang Dalam Negeri - Sektor Perbankan", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.2.01", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 590, kodeBaris: "2.2.02", uraian: "Utang Dalam Negeri - Obligasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.2.02", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 600, kodeBaris: "2.2.03", uraian: "Premium (Diskonto) Obligasi", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.2.03", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 610, kodeBaris: "2.2.04", uraian: "Utang Jangka Panjang Lainnya", tipeBaris: "DETAIL", level: 3, kodeRekening: "2.2.04", posisiNormal: "KREDIT", formula: null, isBold: false },

  { urutan: 620, kodeBaris: "3", uraian: "EKUITAS", tipeBaris: "HEADER", level: 2, kodeRekening: null, posisiNormal: "KREDIT", formula: "3.1", isBold: true },
  { urutan: 630, kodeBaris: "3.1", uraian: "Ekuitas", tipeBaris: "DETAIL", level: 3, kodeRekening: "3.1", posisiNormal: "KREDIT", formula: null, isBold: false },
  { urutan: 640, kodeBaris: "", uraian: "JUMLAH KEWAJIBAN DAN EKUITAS DANA", tipeBaris: "TOTAL", level: 1, kodeRekening: null, posisiNormal: "AUTO", formula: "2+3", isBold: true },
];

export function getDefaultTemplate(jenis: JenisLaporanKeuangan): MappingTemplateRow[] {
  if (jenis === "LRA") return LRA_DEFAULT_TEMPLATE;
  if (jenis === "LO") return LO_DEFAULT_TEMPLATE;
  return NERACA_DEFAULT_TEMPLATE;
}
