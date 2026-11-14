export interface PermissionDefinition {
  kode: string;
  nama: string;
  modul: string;
  deskripsi: string;
  jenis: "MENU" | "AKSI";
  menuHref?: string;
}

export interface MenuPermissionGroup {
  groupKey: string;
  groupTitle: string;
  groupSubtitle: string;
  items: Array<{
    menuKey: string;
    menuLabel: string;
    menuHref: string;
    menuPermKode: string;
    menuPermNama: string;
    modul: string;
    actions: Array<{
      kode: string;
      nama: string;
      deskripsi: string;
    }>;
  }>;
}

/**
 * Katalog Lengkap Modul, Menu Sidebar, dan Hak Aksi (RBAC) SITARIDA
 */
export const RBAC_MODULE_GROUPS: MenuPermissionGroup[] = [
  {
    groupKey: "dashboard",
    groupTitle: "1. Modul Dashboard & Ringkasan Eksekutif",
    groupSubtitle: "Pengaturan tampilan halaman utama ringkasan & realisasi anggaran",
    items: [
      {
        menuKey: "dashboard",
        menuLabel: "Dashboard Utama",
        menuHref: "/dashboard",
        menuPermKode: "dashboard:view",
        menuPermNama: "Tampilkan Menu Dashboard",
        modul: "reporting",
        actions: [],
      },
    ],
  },
  {
    groupKey: "perencanaan",
    groupTitle: "2. Modul Perencanaan Penganggaran",
    groupSubtitle: "Plafont Anggaran, RKA-SKPD, Anggaran Kas (RAK), dan SPD",
    items: [
      {
        menuKey: "plafond",
        menuLabel: "Plafont OPD / Unit",
        menuHref: "/perencanaan/plafond",
        menuPermKode: "menu:perencanaan:plafond",
        menuPermNama: "Tampilkan Menu Plafont OPD / Unit",
        modul: "perencanaan",
        actions: [
          {
            kode: "kuappas:read",
            nama: "Lihat Data Plafont",
            deskripsi: "Melihat daftar pagu plafont anggaran OPD & Unit Kerja",
          },
          {
            kode: "kuappas:manage",
            nama: "Input, Ubah & Kunci RKA (Penyusunan/Perubahan)",
            deskripsi: "Mengubah nominal plafont serta mengunci/membuka kunci input RKA",
          },
        ],
      },
      {
        menuKey: "rka",
        menuLabel: "Rencana Kerja Anggaran (RKA)",
        menuHref: "/perencanaan/rka",
        menuPermKode: "menu:perencanaan:rka",
        menuPermNama: "Tampilkan Menu Rencana Kerja Anggaran (RKA)",
        modul: "perencanaan",
        actions: [
          {
            kode: "rka:read",
            nama: "Lihat Dokumen RKA",
            deskripsi: "Melihat sub kegiatan, rekening, dan rincian belanja RKA",
          },
          {
            kode: "rka:write",
            nama: "Input, Ubah & Hapus Rincian RKA",
            deskripsi: "Menambah/mengubah sub kegiatan, memilih PPTK, dan mengisi rincian belanja",
          },
          {
            kode: "rka:submit",
            nama: "Ajukan RKA-SKPD",
            deskripsi: "Mengajukan dokumen RKA-SKPD untuk diverifikasi",
          },
          {
            kode: "rka:verify",
            nama: "Verifikasi & Setujui RKA",
            deskripsi: "Memverifikasi dan mengesahkan dokumen RKA-SKPD",
          },
        ],
      },
      {
        menuKey: "anggaran-kas",
        menuLabel: "Anggaran Kas Belanja OPD",
        menuHref: "/perencanaan/anggaran-kas",
        menuPermKode: "menu:perencanaan:anggaran-kas",
        menuPermNama: "Tampilkan Menu Anggaran Kas",
        modul: "perencanaan",
        actions: [
          {
            kode: "angkas:read",
            nama: "Lihat Data Anggaran Kas",
            deskripsi: "Melihat pembagian anggaran kas 12 bulan per rekening belanja",
          },
          {
            kode: "angkas:write",
            nama: "Input & Simpan Anggaran Kas 12 Bulan",
            deskripsi: "Mengisi, membagi rata, dan menyimpan anggaran kas bulanan",
          },
          {
            kode: "angkas:lock",
            nama: "Kunci / Buka Kunci (Lock) Anggaran Kas",
            deskripsi: "Mengunci dan membuka kunci penginputan anggaran kas OPD",
          },
        ],
      },
      {
        menuKey: "spd",
        menuLabel: "Surat Penyediaan Dana (SPD)",
        menuHref: "/perencanaan/spd",
        menuPermKode: "menu:perencanaan:spd",
        menuPermNama: "Tampilkan Menu Surat Penyediaan Dana (SPD)",
        modul: "perencanaan",
        actions: [
          {
            kode: "spd:read",
            nama: "Lihat Dokumen SPD",
            deskripsi: "Melihat daftar dan rincian Surat Penyediaan Dana (SPD)",
          },
          {
            kode: "dpa:manage",
            nama: "Kelola & Terbitkan SPD / DPA",
            deskripsi: "Membuat, mengubah, dan mengesahkan dokumen SPD / DPA",
          },
        ],
      },
      {
        menuKey: "cetak-dokumen",
        menuLabel: "Cetak Dokumen Anggaran",
        menuHref: "/perencanaan/cetak-dokumen",
        menuPermKode: "menu:perencanaan:cetak-dokumen",
        menuPermNama: "Tampilkan Menu Cetak Dokumen Anggaran (Permendagri 17/2026)",
        modul: "perencanaan",
        actions: [
          {
            kode: "apbd:print",
            nama: "Cetak Dokumen APBD (Permendagri 17/2026)",
            deskripsi: "Mencetak 9 dokumen resmi anggaran APBD sesuai Permendagri No. 17 Tahun 2026",
          },
        ],
      },
      {
        menuKey: "rka-skpd",
        menuLabel: "RKA SKPD",
        menuHref: "/perencanaan/rka-skpd",
        menuPermKode: "menu:perencanaan:rka-skpd",
        menuPermNama: "Tampilkan Menu Formulir RKA SKPD",
        modul: "perencanaan",
        actions: [
          {
            kode: "rka:print",
            nama: "Cetak Formulir Ringkasan RKA SKPD",
            deskripsi: "Mencetak dokumen formulir resmi RKA SKPD per Organisasi / OPD",
          },
        ],
      },
      {
        menuKey: "dpa-skpd",
        menuLabel: "DPA SKPD",
        menuHref: "/perencanaan/dpa-skpd",
        menuPermKode: "menu:perencanaan:dpa-skpd",
        menuPermNama: "Tampilkan Menu Formulir DPA SKPD",
        modul: "perencanaan",
        actions: [
          {
            kode: "dpa:print",
            nama: "Cetak Formulir Ringkasan DPA SKPD",
            deskripsi: "Mencetak dokumen formulir resmi DPA SKPD per Organisasi / OPD",
          },
        ],
      },
    ],
  },
  {
    groupKey: "penatausahaan",
    groupTitle: "3. Modul Penatausahaan Keuangan",
    groupSubtitle: "Pengaturan Penatausahaan, Penetapan Besaran UP & UP-KKPD, SPP, SPM, dan SP2D",
    items: [
      {
        menuKey: "pengaturan-penatausahaan",
        menuLabel: "Besaran UP",
        menuHref: "/penatausahaan/pengaturan",
        menuPermKode: "menu:penatausahaan:pengaturan",
        menuPermNama: "Tampilkan Menu Besaran UP",
        modul: "penatausahaan",
        actions: [
          {
            kode: "penatausahaan:up:read",
            nama: "Lihat Ketetapan UP & UP-KKPD",
            deskripsi: "Melihat daftar besaran Uang Persediaan (UP) Tunai dan UP-KKPD seluruh SKPD",
          },
          {
            kode: "penatausahaan:up:manage",
            nama: "Input, Ubah & Tetapkan Besaran UP & UP-KKPD",
            deskripsi: "Menetapkan nomor SK, nominal UP tunai, UP-KKPD, dan Bank Penerbit KKPD",
          },
        ],
      },
      {
        menuKey: "pengajuan-kuitansi",
        menuLabel: "Kuitansi",
        menuHref: "/penatausahaan/pengajuan/kuitansi",
        menuPermKode: "menu:penatausahaan:pengajuan-kuitansi",
        menuPermNama: "Tampilkan Menu Kuitansi (Pengajuan Belanja PPTK)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "kuitansi:read",
            nama: "Lihat Data Kuitansi",
            deskripsi: "Melihat daftar kuitansi pengajuan belanja dan rinciannya",
          },
          {
            kode: "kuitansi:write",
            nama: "Buat & Ubah Kuitansi",
            deskripsi: "Membuat baru, mengubah, dan menghapus kuitansi DRAFT",
          },
          {
            kode: "kuitansi:submit",
            nama: "Ajukan Kuitansi ke PA/KPA",
            deskripsi: "Mengajukan kuitansi belanja untuk disetujui Pengguna Anggaran",
          },
          {
            kode: "kuitansi:verify",
            nama: "Verifikasi & Setujui Kuitansi",
            deskripsi: "Menyetujui atau menolak pengajuan kuitansi oleh PA/KPA",
          },
          {
            kode: "kuitansi:print",
            nama: "Cetak Formulir Kuitansi",
            deskripsi: "Mencetak bukti pengeluaran kuitansi resmi",
          },
        ],
      },
      {
        menuKey: "pengajuan-register",
        menuLabel: "Register Kuitansi",
        menuHref: "/penatausahaan/pengajuan/register-kuitansi",
        menuPermKode: "menu:penatausahaan:pengajuan-register",
        menuPermNama: "Tampilkan Menu Register Kuitansi",
        modul: "penatausahaan",
        actions: [
          {
            kode: "kuitansi:register:print",
            nama: "Cetak Buku Register Kuitansi",
            deskripsi: "Mencetak rekapitulasi buku register kuitansi pengajuan belanja",
          },
        ],
      },
      {
        menuKey: "spp-up",
        menuLabel: "SPP-UP",
        menuHref: "/penatausahaan/spp/up",
        menuPermKode: "menu:penatausahaan:spp-up",
        menuPermNama: "Tampilkan Menu SPP-UP (Uang Persediaan)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "spp:read",
            nama: "Lihat Dokumen SPP",
            deskripsi: "Melihat daftar dokumen SPP beserta rincian rekening belanjanya",
          },
          {
            kode: "spp:write",
            nama: "Input, Ubah & Hapus Dokumen SPP",
            deskripsi: "Membuat dokumen SPP baru, mengubah data, dan mengisi rekening belanja",
          },
          {
            kode: "spp:submit",
            nama: "Ajukan SPP ke Pejabat Penguji (SPM)",
            deskripsi: "Mengajukan dokumen SPP untuk diverifikasi dan diterbitkan SPM",
          },
        ],
      },
      {
        menuKey: "spp-gu",
        menuLabel: "SPP-GU",
        menuHref: "/penatausahaan/spp/gu",
        menuPermKode: "menu:penatausahaan:spp-gu",
        menuPermNama: "Tampilkan Menu SPP-GU (Ganti Uang)",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-tu",
        menuLabel: "SPP-TU",
        menuHref: "/penatausahaan/spp/tu",
        menuPermKode: "menu:penatausahaan:spp-tu",
        menuPermNama: "Tampilkan Menu SPP-TU (Tambah Uang)",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-ls-gaji",
        menuLabel: "SPP-LS Gaji",
        menuHref: "/penatausahaan/spp/ls-gaji",
        menuPermKode: "menu:penatausahaan:spp-ls-gaji",
        menuPermNama: "Tampilkan Menu SPP-LS Gaji & Tunjangan",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-ls-barjas",
        menuLabel: "SPP-LS Barang dan Jasa",
        menuHref: "/penatausahaan/spp/ls-barang-jasa",
        menuPermKode: "menu:penatausahaan:spp-ls-barang-jasa",
        menuPermNama: "Tampilkan Menu SPP-LS Barang dan Jasa",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-up-kkpd",
        menuLabel: "SPP-UP KKPD",
        menuHref: "/penatausahaan/spp/up-kkpd",
        menuPermKode: "menu:penatausahaan:spp-up-kkpd",
        menuPermNama: "Tampilkan Menu SPP-UP KKPD",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-gu-kkpd",
        menuLabel: "SPP-GU KKPD",
        menuHref: "/penatausahaan/spp/gu-kkpd",
        menuPermKode: "menu:penatausahaan:spp-gu-kkpd",
        menuPermNama: "Tampilkan Menu SPP-GU KKPD",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "spp-register",
        menuLabel: "Register SPP",
        menuHref: "/penatausahaan/spp/register",
        menuPermKode: "menu:penatausahaan:spp-register",
        menuPermNama: "Tampilkan Menu Register SPP",
        modul: "penatausahaan",
        actions: [
          {
            kode: "spp:print",
            nama: "Cetak Register & Dokumen SPP",
            deskripsi: "Mencetak buku register SPP serta formulir kelengkapan SPP",
          },
        ],
      },
      {
        menuKey: "spm-pembuatan",
        menuLabel: "Pembuatan SPM",
        menuHref: "/penatausahaan/spm/pembuatan",
        menuPermKode: "menu:penatausahaan:spm",
        menuPermNama: "Tampilkan Menu Pembuatan SPM (Seluruh Jenis SPM)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "spm:read",
            nama: "Lihat Dokumen SPM",
            deskripsi: "Melihat daftar dokumen Surat Perintah Membayar (SPM)",
          },
          {
            kode: "spm:write",
            nama: "Input, Ubah & Hapus Dokumen SPM",
            deskripsi: "Menerbitkan SPM dari SPP, menginput potongan pajak dan rekening penatausahaan",
          },
          {
            kode: "spm:print",
            nama: "Cetak Dokumen Format Resmi SPM",
            deskripsi: "Mencetak lembar resmi Surat Perintah Membayar (SPM) beserta lampiran",
          },
        ],
      },
      {
        menuKey: "spm-register",
        menuLabel: "Register SPM",
        menuHref: "/penatausahaan/spm/register",
        menuPermKode: "menu:penatausahaan:spm-register",
        menuPermNama: "Tampilkan Menu Register SPM (Buku Rekapitulasi SPM)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "spm:register:print",
            nama: "Cetak Buku Register SPM",
            deskripsi: "Mencetak lembar buku register SPM resmi format A4 Landscape",
          },
        ],
      },
      {
        menuKey: "sp2d-pembuatan",
        menuLabel: "Pembuatan SP2D",
        menuHref: "/penatausahaan/sp2d/pembuatan",
        menuPermKode: "menu:penatausahaan:sp2d-pembuatan",
        menuPermNama: "Tampilkan Menu Pembuatan SP2D (Kuasa BUD / Perbendaharaan)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "sp2d:read",
            nama: "Lihat Dokumen SP2D",
            deskripsi: "Melihat daftar dokumen Surat Perintah Pencairan Dana (SP2D)",
          },
          {
            kode: "sp2d:write",
            nama: "Terbitkan & Kelola Dokumen SP2D",
            deskripsi: "Menerbitkan SP2D dari dokumen SPM terbit dan mengatur rekening pembayar RKUD",
          },
          {
            kode: "sp2d:print",
            nama: "Cetak Lembar Resmi SP2D",
            deskripsi: "Mencetak lembar resmi format SP2D beserta lampiran pembebanan dan potongan",
          },
        ],
      },
      {
        menuKey: "sp2d-verifikasi",
        menuLabel: "Verifikasi SP2D",
        menuHref: "/penatausahaan/sp2d/verifikasi",
        menuPermKode: "menu:penatausahaan:sp2d-verifikasi",
        menuPermNama: "Tampilkan Menu Verifikasi & Pengesahan SP2D",
        modul: "penatausahaan",
        actions: [
          {
            kode: "sp2d:verify",
            nama: "Verifikasi & Sahkan SP2D",
            deskripsi: "Memeriksa kelengkapan SP2D, memberikan catatan, dan menyahkan SP2D oleh Kuasa BUD",
          },
        ],
      },
      {
        menuKey: "sp2d-register",
        menuLabel: "Register SP2D",
        menuHref: "/penatausahaan/sp2d/register",
        menuPermKode: "menu:penatausahaan:sp2d-register",
        menuPermNama: "Tampilkan Menu Register SP2D (Buku Kas Pencairan Daerah)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "sp2d:register:print",
            nama: "Cetak Buku Register SP2D",
            deskripsi: "Mencetak lembar buku register SP2D resmi A4 Landscape",
          },
        ],
      },
      {
        menuKey: "sp2d-monitoring",
        menuLabel: "Monitoring Pencairan",
        menuHref: "/penatausahaan/sp2d/monitoring",
        menuPermKode: "menu:penatausahaan:sp2d-monitoring",
        menuPermNama: "Tampilkan Menu Monitoring Pencairan Bank RKUD",
        modul: "penatausahaan",
        actions: [
          {
            kode: "sp2d:monitoring:update",
            nama: "Update Pencatatan Pencairan Bank",
            deskripsi: "Mencatat nomor transaksi bank dan tanggal pencairan dana kas daerah",
          },
        ],
      },
    ],
  },
  {
    groupKey: "penatausahaanBud",
    groupTitle: "4. Modul Kas Daerah & BUD",
    groupSubtitle: "Penerimaan Daerah, Pengeluaran Daerah, BKU Kas Daerah, DTH/RTH, dan Rekapitulasi Kas",
    items: [
      {
        menuKey: "bud-penerimaan",
        menuLabel: "Penerimaan Daerah",
        menuHref: "/penatausahaan/bud/penerimaan",
        menuPermKode: "menu:penatausahaan:bud-penerimaan",
        menuPermNama: "Tampilkan Menu Penerimaan Daerah",
        modul: "penatausahaan",
        actions: [
          {
            kode: "bud:read",
            nama: "Lihat Transaksi Kas BUD",
            deskripsi: "Melihat data pembukuan penerimaan, pengeluaran, BKU, dan rekapitulasi kas daerah",
          },
          {
            kode: "bud:write",
            nama: "Kelola Transaksi & Rekonsiliasi Kas BUD",
            deskripsi: "Mencatat dan memvalidasi transaksi penerimaan dan pengeluaran kas daerah BUD",
          },
        ],
      },
      {
        menuKey: "bud-pengeluaran",
        menuLabel: "Pengeluaran Daerah",
        menuHref: "/penatausahaan/bud/pengeluaran",
        menuPermKode: "menu:penatausahaan:bud-pengeluaran",
        menuPermNama: "Tampilkan Menu Pengeluaran Daerah",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bud-bku",
        menuLabel: "Buku Kas Umum Daerah (BKU)",
        menuHref: "/penatausahaan/bud/bku",
        menuPermKode: "menu:penatausahaan:bud-bku",
        menuPermNama: "Tampilkan Menu Buku Kas Umum Daerah (BKU)",
        modul: "penatausahaan",
        actions: [
          {
            kode: "bud:print",
            nama: "Cetak Laporan Kas BUD",
            deskripsi: "Mencetak buku kas umum (BKU) daerah serta rekapitulasi penerimaan dan pengeluaran",
          },
        ],
      },
      {
        menuKey: "bud-dth-rth",
        menuLabel: "DTH dan RTH",
        menuHref: "/penatausahaan/bud/dth-rth",
        menuPermKode: "menu:penatausahaan:bud-dth-rth",
        menuPermNama: "Tampilkan Menu DTH dan RTH",
        modul: "penatausahaan",
        actions: [
          {
            kode: "bud:dth:print",
            nama: "Cetak Laporan DTH & RTH",
            deskripsi: "Mencetak Daftar Transaksi Harian dan Rekapitulasi Transaksi Harian kas daerah",
          },
        ],
      },
      {
        menuKey: "bud-rekap-penerimaan",
        menuLabel: "Rekapitulasi Penerimaan",
        menuHref: "/penatausahaan/bud/rekap-penerimaan",
        menuPermKode: "menu:penatausahaan:bud-rekap-penerimaan",
        menuPermNama: "Tampilkan Menu Rekapitulasi Penerimaan",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bud-rekap-pengeluaran",
        menuLabel: "Rekapitulasi Pengeluaran",
        menuHref: "/penatausahaan/bud/rekap-pengeluaran",
        menuPermKode: "menu:penatausahaan:bud-rekap-pengeluaran",
        menuPermNama: "Tampilkan Menu Rekapitulasi Pengeluaran",
        modul: "penatausahaan",
        actions: [],
      },
    ],
  },
  {
    groupKey: "penatausahaanBendahara",
    groupTitle: "5. Modul Bendahara Pengeluaran",
    groupSubtitle: "Pembukuan SP2D, Validasi & Pembukuan SPJ, Potongan Pajak, Pengembalian, dan LPJ/LPJ-KKPD",
    items: [
      {
        menuKey: "bendahara-pembukuan-sp2d",
        menuLabel: "Pembukuan SP2D",
        menuHref: "/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d",
        menuPermKode: "menu:penatausahaan:bendahara-pembukuan-sp2d",
        menuPermNama: "Tampilkan Menu Pembukuan SP2D",
        modul: "penatausahaan",
        actions: [
          {
            kode: "bendahara:read",
            nama: "Lihat Data Transaksi Bendahara",
            deskripsi: "Melihat data pembukuan SP2D, SPJ, potongan pajak, sisa kas, dan LPJ",
          },
          {
            kode: "bendahara:write",
            nama: "Kelola Pembukuan & Transaksi Bendahara",
            deskripsi: "Menginput dan memproses transaksi kas pengeluaran, SPJ, dan potongan pajak",
          },
        ],
      },
      {
        menuKey: "bendahara-validasi-spj",
        menuLabel: "Validasi SPJ",
        menuHref: "/penatausahaan/bendahara-pengeluaran/validasi-spj",
        menuPermKode: "menu:penatausahaan:bendahara-validasi-spj",
        menuPermNama: "Tampilkan Menu Validasi SPJ",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-pembukuan-spj",
        menuLabel: "Pembukuan SPJ",
        menuHref: "/penatausahaan/bendahara-pengeluaran/pembukuan-spj",
        menuPermKode: "menu:penatausahaan:bendahara-pembukuan-spj",
        menuPermNama: "Tampilkan Menu Pembukuan SPJ",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-penerimaan-potongan",
        menuLabel: "Penerimaan Potongan",
        menuHref: "/penatausahaan/bendahara-pengeluaran/penerimaan-potongan",
        menuPermKode: "menu:penatausahaan:bendahara-penerimaan-potongan",
        menuPermNama: "Tampilkan Menu Penerimaan Potongan",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-penyetoran-potongan",
        menuLabel: "Penyetoran Potongan",
        menuHref: "/penatausahaan/bendahara-pengeluaran/penyetoran-potongan",
        menuPermKode: "menu:penatausahaan:bendahara-penyetoran-potongan",
        menuPermNama: "Tampilkan Menu Penyetoran Potongan",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-setor-sisa-kas",
        menuLabel: "Setor Sisa Kas (UP/GU/TU)",
        menuHref: "/penatausahaan/bendahara-pengeluaran/setor-sisa-kas",
        menuPermKode: "menu:penatausahaan:bendahara-setor-sisa-kas",
        menuPermNama: "Tampilkan Menu Setor Sisa Kas (UP/GU/TU)",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-pengembalian",
        menuLabel: "Pengembalian",
        menuHref: "/penatausahaan/bendahara-pengeluaran/pengembalian",
        menuPermKode: "menu:penatausahaan:bendahara-pengembalian",
        menuPermNama: "Tampilkan Menu Pengembalian",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-rekal-transaksi",
        menuLabel: "Rekal Transaksi",
        menuHref: "/penatausahaan/bendahara-pengeluaran/rekal-transaksi",
        menuPermKode: "menu:penatausahaan:bendahara-rekal-transaksi",
        menuPermNama: "Tampilkan Menu Rekal Transaksi",
        modul: "penatausahaan",
        actions: [],
      },
      {
        menuKey: "bendahara-lpj",
        menuLabel: "LPJ",
        menuHref: "/penatausahaan/bendahara-pengeluaran/lpj",
        menuPermKode: "menu:penatausahaan:bendahara-lpj",
        menuPermNama: "Tampilkan Menu LPJ",
        modul: "penatausahaan",
        actions: [
          {
            kode: "bendahara:print",
            nama: "Cetak Dokumen LPJ & Lampiran",
            deskripsi: "Mencetak laporan pertanggungjawaban UP/GU/TU bendahara pengeluaran",
          },
        ],
      },
      {
        menuKey: "bendahara-lpj-kkpd",
        menuLabel: "LPJ-KKPD",
        menuHref: "/penatausahaan/bendahara-pengeluaran/lpj-kkpd",
        menuPermKode: "menu:penatausahaan:bendahara-lpj-kkpd",
        menuPermNama: "Tampilkan Menu LPJ-KKPD",
        modul: "penatausahaan",
        actions: [],
      },
    ],
  },
  {
    groupKey: "masterRekeningOpd",
    groupTitle: "6. Modul Master Data — Rekening & Organisasi",
    groupSubtitle: "Master Rekening 6 Level, Master Perangkat Daerah (OPD), dan Master Unit Kerja",
    items: [
      {
        menuKey: "master-rekening",
        menuLabel: "Master Rekening",
        menuHref: "/master/rekening",
        menuPermKode: "menu:master:rekening",
        menuPermNama: "Tampilkan Menu Master Rekening",
        modul: "master-data",
        actions: [
          {
            kode: "master:write",
            nama: "Tambah, Ubah & Hapus Data Master",
            deskripsi: "Mengelola penambahan, perubahan, dan penghapusan data master",
          },
        ],
      },
      {
        menuKey: "master-opd",
        menuLabel: "Master OPD",
        menuHref: "/master/opd",
        menuPermKode: "menu:master:opd",
        menuPermNama: "Tampilkan Menu Master OPD",
        modul: "master-data",
        actions: [
          {
            kode: "opd:manage",
            nama: "Kelola Perangkat Daerah & Unit Kerja",
            deskripsi: "Menambah, mengubah, dan menghapus data OPD serta Unit Kerja",
          },
        ],
      },
      {
        menuKey: "master-unit",
        menuLabel: "Master Unit Kerja",
        menuHref: "/master/unit",
        menuPermKode: "menu:master:unit",
        menuPermNama: "Tampilkan Menu Master Unit Kerja",
        modul: "master-data",
        actions: [],
      },
    ],
  },
  {
    groupKey: "masterNomenklatur",
    groupTitle: "7. Modul Master Data — Nomenklatur & Dana",
    groupSubtitle: "Master Program, Kegiatan, Sub Kegiatan, dan Sumber Dana",
    items: [
      {
        menuKey: "master-program",
        menuLabel: "Master Program",
        menuHref: "/master/program",
        menuPermKode: "menu:master:program",
        menuPermNama: "Tampilkan Menu Master Program",
        modul: "master-data",
        actions: [],
      },
      {
        menuKey: "master-kegiatan",
        menuLabel: "Master Kegiatan",
        menuHref: "/master/kegiatan",
        menuPermKode: "menu:master:kegiatan",
        menuPermNama: "Tampilkan Menu Master Kegiatan",
        modul: "master-data",
        actions: [],
      },
      {
        menuKey: "master-subkegiatan",
        menuLabel: "Master Sub Kegiatan",
        menuHref: "/master/subkegiatan",
        menuPermKode: "menu:master:subkegiatan",
        menuPermNama: "Tampilkan Menu Master Sub Kegiatan",
        modul: "master-data",
        actions: [],
      },
      {
        menuKey: "master-sumber-dana",
        menuLabel: "Master Sumber Dana",
        menuHref: "/master/sumber-dana",
        menuPermKode: "menu:master:sumber-dana",
        menuPermNama: "Tampilkan Menu Master Sumber Dana",
        modul: "master-data",
        actions: [],
      },
    ],
  },
  {
    groupKey: "masterReferensi",
    groupTitle: "8. Modul Master Data — Pengaturan Master",
    groupSubtitle: "Tahun Anggaran, Standar Harga (SSH/SBU/HSPK/ASB), dan Import Template",
    items: [
      {
        menuKey: "master-tahun-anggaran",
        menuLabel: "Tahun Anggaran",
        menuHref: "/master/tahun-anggaran",
        menuPermKode: "menu:master:tahun-anggaran",
        menuPermNama: "Tampilkan Menu Tahun Anggaran",
        modul: "master-data",
        actions: [],
      },
      {
        menuKey: "master-standar-harga",
        menuLabel: "Standar Harga (SSH)",
        menuHref: "/master/standar-harga",
        menuPermKode: "menu:master:standar-harga",
        menuPermNama: "Tampilkan Menu Standar Harga (SSH)",
        modul: "master-data",
        actions: [],
      },
      {
        menuKey: "master-import",
        menuLabel: "Import Template Master Data",
        menuHref: "/master/import",
        menuPermKode: "menu:master:import",
        menuPermNama: "Tampilkan Menu Import Template",
        modul: "master-data",
        actions: [
          {
            kode: "master:import",
            nama: "Eksekusi Import & Validasi Excel",
            deskripsi: "Mengunggah dan mengeksekusi import template data master",
          },
        ],
      },
    ],
  },
  {
    groupKey: "pengaturan",
    groupTitle: "9. Modul Pengaturan & Administrasi Sistem",
    groupSubtitle: "Manajemen Pegawai/User Multi-Peran, Konfigurasi Role & Hak Akses, serta Audit Log",
    items: [
      {
        menuKey: "admin-users",
        menuLabel: "Data Pegawai / User",
        menuHref: "/admin/users",
        menuPermKode: "menu:admin:users",
        menuPermNama: "Tampilkan Menu Data Pegawai / User",
        modul: "users",
        actions: [
          {
            kode: "users:read",
            nama: "Lihat Daftar Pengguna",
            deskripsi: "Melihat daftar akun pegawai dan penugasan OPD/Unit",
          },
          {
            kode: "users:manage",
            nama: "Tambah, Ubah, Kunci & Hapus Pengguna",
            deskripsi: "Mengelola akun pegawai dan penugasan multi-peran",
          },
        ],
      },
      {
        menuKey: "admin-roles",
        menuLabel: "Role & Hak Akses",
        menuHref: "/admin/roles",
        menuPermKode: "menu:admin:roles",
        menuPermNama: "Tampilkan Menu Role & Hak Akses",
        modul: "users",
        actions: [],
      },
      {
        menuKey: "admin-audit",
        menuLabel: "Laporan Audit Log",
        menuHref: "/admin/audit-log",
        menuPermKode: "menu:admin:audit",
        menuPermNama: "Tampilkan Menu Laporan Audit Log",
        modul: "audit",
        actions: [
          {
            kode: "audit:read",
            nama: "Lihat & Filter Jejak Audit",
            deskripsi: "Melihat rekaman aktivitas pengguna pada sistem",
          },
        ],
      },
    ],
  },
];

/**
 * Menghasilkan daftar datar seluruh definisi permission yang wajib ada di tabel Permission
 */
export function getAllCatalogPermissions(): PermissionDefinition[] {
  const map = new Map<string, PermissionDefinition>();

  for (const grp of RBAC_MODULE_GROUPS) {
    for (const item of grp.items) {
      map.set(item.menuPermKode, {
        kode: item.menuPermKode,
        nama: item.menuPermNama,
        modul: item.modul,
        deskripsi: `Menampilkan menu '${item.menuLabel}' (${item.menuHref}) pada navigasi sidebar`,
        jenis: "MENU",
        menuHref: item.menuHref,
      });

      for (const act of item.actions) {
        if (!map.has(act.kode)) {
          map.set(act.kode, {
            kode: act.kode,
            nama: act.nama,
            modul: item.modul,
            deskripsi: act.deskripsi,
            jenis: "AKSI",
          });
        }
      }
    }
  }

  // Permission komposit / backend yang tetap dipertahankan untuk kompatibilitas API
  const extraPerms: PermissionDefinition[] = [
    {
      kode: "master:read",
      nama: "Lihat Master Data & Nomenklatur (API)",
      modul: "master-data",
      deskripsi: "Akses baca data referensi & nomenklatur master",
      jenis: "AKSI",
    },
    {
      kode: "apbd:manage",
      nama: "Konsolidasi & Penetapan APBD",
      modul: "perencanaan",
      deskripsi: "Mengelola tahapan konsolidasi dan penetapan APBD",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spp-ls-barjas",
      nama: "Tampilkan Menu SPP-LS Barang dan Jasa (Alias)",
      modul: "penatausahaan",
      deskripsi: "Alias kompatibilitas navigasi menu SPP-LS Barjas",
      jenis: "MENU",
    },
    {
      kode: "menu:penatausahaan:spm-up",
      nama: "Akses SPM-UP (Uang Persediaan)",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM Uang Persediaan",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-gu",
      nama: "Akses SPM-GU (Ganti Uang)",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM Ganti Uang",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-tu",
      nama: "Akses SPM-TU (Tambah Uang)",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM Tambah Uang",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-ls-gaji",
      nama: "Akses SPM-LS Gaji & Tunjangan",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM LS Gaji & Tunjangan",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-ls-barjas",
      nama: "Akses SPM-LS Barang dan Jasa",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM LS Barang dan Jasa",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-up-kkpd",
      nama: "Akses SPM-UP KKPD",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM UP KKPD",
      jenis: "AKSI",
    },
    {
      kode: "menu:penatausahaan:spm-gu-kkpd",
      nama: "Akses SPM-GU KKPD",
      modul: "penatausahaan",
      deskripsi: "Hak akses pemrosesan SPM GU KKPD",
      jenis: "AKSI",
    },
  ];

  for (const ep of extraPerms) {
    if (!map.has(ep.kode)) {
      map.set(ep.kode, ep);
    }
  }

  return Array.from(map.values());
}

