# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# SITARIDA — Sistem Informasi Penatausahaan Keuangan Terintegrasi Daerah

| Informasi | Keterangan |
|---|---|
| Nama Produk | SITARIDA |
| Kepanjangan | Sistem Informasi Penatausahaan Keuangan Terintegrasi Daerah |
| Pemilik Produk | Pemerintah Kabupaten Tapanuli Selatan |
| Versi Dokumen | 1.0 |
| Status | Draft untuk validasi pemangku kepentingan |
| Tanggal | 5 November 2026 |
| Tahap Pengembangan | Budgeting |
| Arsitektur | Modular Monolith |
| Posisi terhadap SIPD RI | Aplikasi mandiri; bukan pengganti SIPD RI tanpa dasar dan persetujuan yang sah |

---

## 1. Ringkasan Eksekutif

SITARIDA adalah aplikasi Pemerintah Daerah untuk mendukung tata kelola keuangan daerah secara terintegrasi, mulai dari perencanaan dan penganggaran, penatausahaan, hingga akuntansi dan pelaporan.

Pengembangan dilakukan secara bertahap dengan pendekatan modular. Tahap pertama difokuskan pada **Budgeting**, yaitu pengelolaan data anggaran, penyusunan RKA-SKPD, proses verifikasi dan persetujuan, konsolidasi APBD, serta penyusunan DPA-SKPD.

SITARIDA dirancang sebagai aplikasi mandiri dengan pengelolaan pengguna, data, proses bisnis, dan infrastruktur sendiri. Kemandirian teknis ini tidak dengan sendirinya memberikan kewenangan untuk menggantikan aplikasi pemerintah yang diwajibkan. Penggunaan operasional, pertukaran data, dan kedudukan dokumen SITARIDA harus mengikuti regulasi serta persetujuan instansi berwenang.

## 2. Latar Belakang

Pengelolaan keuangan daerah melibatkan banyak perangkat daerah, tahapan, dokumen, klasifikasi rekening, dan proses persetujuan. Pemerintah daerah membutuhkan dukungan sistem yang dapat membantu:

- Menata data anggaran secara konsisten.
- Memfasilitasi penyusunan dan pemeriksaan anggaran OPD.
- Memantau pagu dan usulan anggaran.
- Menelusuri perubahan dan persetujuan dokumen.
- Menyediakan rekapitulasi lintas OPD.
- Menyiapkan fondasi data untuk penatausahaan dan pelaporan pada tahap berikutnya.

SITARIDA dikembangkan untuk memenuhi kebutuhan tersebut melalui sistem modular, terstruktur, dan dapat dikembangkan secara bertahap.

## 3. Visi Produk

Mewujudkan sistem informasi tata kelola keuangan daerah yang terintegrasi, akuntabel, transparan, mudah digunakan, dan mendukung pengambilan keputusan Pemerintah Kabupaten Tapanuli Selatan.

## 4. Tujuan Produk

1. Menyediakan sumber data anggaran yang konsisten berdasarkan tahun anggaran dan perangkat daerah.
2. Mendukung penyusunan RKA-SKPD secara terstruktur.
3. Menyediakan validasi pagu, rekening, nomenklatur, dan perhitungan anggaran.
4. Mengelola proses pengajuan, verifikasi, revisi, dan persetujuan.
5. Mendukung konsolidasi anggaran pemerintah daerah.
6. Mendukung pencatatan hasil penetapan APBD dan pembentukan DPA-SKPD.
7. Menyediakan dashboard dan laporan anggaran.
8. Menyimpan jejak audit dan histori perubahan dokumen.
9. Menyiapkan fondasi data untuk modul penatausahaan, akuntansi, dan pelaporan.

## 5. Sasaran dan Indikator Keberhasilan

| Sasaran | Indikator keberhasilan |
|---|---|
| Pengelolaan master data | Data OPD, rekening, program, kegiatan, subkegiatan, dan sumber dana tersedia serta tervalidasi |
| Penyusunan RKA | OPD dapat menyusun dan menyimpan RKA sesuai kewenangannya |
| Akurasi perhitungan | Total rincian, subkegiatan, kegiatan, program, dan OPD konsisten |
| Pengendalian pagu | Sistem memberi peringatan atau menolak usulan yang melanggar batas pagu yang berlaku |
| Workflow | Setiap pengajuan dan keputusan memiliki aktor, waktu, status, dan catatan |
| Konsolidasi | Rekapitulasi dapat ditelusuri kembali ke dokumen sumber |
| Dokumen | Dokumen RKA, APBD, dan DPA dapat ditampilkan atau diekspor sesuai template yang disahkan |
| Auditabilitas | Perubahan penting dan aktivitas persetujuan tercatat |
| Keamanan | Pengguna hanya dapat mengakses fungsi dan data sesuai kewenangannya |

Target numerik, seperti persentase adopsi OPD, waktu pemrosesan, dan toleransi kesalahan, ditetapkan bersama pemilik proses pada tahap UAT.

## 6. Pengguna dan Pemangku Kepentingan

### 6.1 Kelompok pengguna

| Peran | Tanggung jawab dalam aplikasi |
|---|---|
| Superadmin | Konfigurasi sistem, pengguna, role, dan parameter global |
| Admin BPKPAD | Administrasi master data dan proses penganggaran sesuai penugasan |
| Pimpinan BPKPAD | Monitoring dan keputusan sesuai kewenangan |
| TAPD | Pembahasan, evaluasi, dan konsolidasi anggaran sesuai penugasan |
| Admin OPD | Administrasi data dan pengguna pada OPD |
| Kepala OPD | Peninjauan dan persetujuan usulan OPD sesuai kewenangan |
| PPK-SKPD | Pemeriksaan dokumen sesuai tugas dan kewenangan |
| PPTK | Penyusunan rincian kegiatan dan anggaran sesuai penugasan |
| Viewer/Auditor | Melihat data atau laporan sesuai hak akses |

Daftar peran merupakan rancangan awal. Nama jabatan, delegasi, dan kewenangan final harus disesuaikan dengan struktur organisasi serta ketentuan pengelolaan keuangan daerah.

### 6.2 Prinsip hak akses

- Hak akses mengikuti prinsip least privilege.
- Pengguna OPD dibatasi pada OPD yang menjadi tanggung jawabnya.
- Akses lintas OPD diberikan hanya kepada peran yang berwenang.
- Persetujuan harus dilakukan oleh pengguna yang memiliki penugasan yang sesuai.
- Aktivitas administratif dan persetujuan dicatat dalam audit log.

## 7. Ruang Lingkup Produk

### 7.1 Cakupan keseluruhan visi SITARIDA

1. Perencanaan dan penganggaran (*budgeting*).
2. Penatausahaan keuangan daerah.
3. Akuntansi dan pelaporan keuangan daerah.
4. Monitoring, evaluasi, dan analitik keuangan.
5. Administrasi, keamanan, dan audit sistem.

### 7.2 Cakupan tahap pertama — Budgeting

**Termasuk dalam MVP:**

- Autentikasi dan manajemen pengguna.
- Role, permission, dan pembatasan akses OPD.
- Master tahun anggaran dan perangkat daerah.
- Master nomenklatur program, kegiatan, dan subkegiatan.
- Master rekening dan sumber dana.
- Master satuan serta referensi/standar harga bila diperlukan.
- Import dan validasi master data.
- Pengelolaan KUA-PPAS atau data plafon sesuai kebutuhan dan kewenangan.
- Penyusunan RKA-SKPD.
- Rincian komponen belanja dan kalkulasi.
- Validasi pagu dan nomenklatur.
- Workflow pengajuan, verifikasi, revisi, dan persetujuan.
- Konsolidasi usulan anggaran.
- Pencatatan hasil penetapan APBD.
- Pembentukan dan pengelolaan DPA-SKPD.
- Dashboard, laporan, ekspor, dan pencetakan.
- Audit log dan histori versi dokumen.

**Tidak termasuk dalam MVP:**

- Pembuatan transaksi penatausahaan seperti SPD, SPP, SPM, dan SP2D.
- Pengelolaan kas dan rekening bank.
- Integrasi transaksi perbankan.
- Penjurnalan dan buku besar.
- Penyusunan laporan keuangan berbasis transaksi.
- Penggajian dan modul aset, kecuali ditetapkan sebagai kebutuhan terpisah.
- Integrasi eksternal yang belum memiliki spesifikasi, akses, dan persetujuan resmi.

## 8. Alur Proses Bisnis Utama

### 8.1 Alur Budgeting

1. Admin menyiapkan tahun anggaran.
2. Admin mengelola atau mengimpor master data dan nomenklatur yang berlaku.
3. Data kebijakan dan plafon anggaran disiapkan sesuai proses pemerintah daerah.
4. OPD menyusun RKA berdasarkan program, kegiatan, subkegiatan, rekening, dan sumber dana.
5. PPTK atau petugas terkait mengisi rincian kebutuhan dan perhitungan.
6. Sistem menjalankan validasi struktur, pagu, dan nilai.
7. Dokumen diajukan untuk pemeriksaan.
8. Pejabat/role berwenang melakukan verifikasi, persetujuan, atau mengembalikan dokumen untuk revisi.
9. Dokumen yang disetujui dikonsolidasikan.
10. Hasil penetapan APBD dicatat sesuai dokumen resmi.
11. DPA dibentuk dari data anggaran yang telah ditetapkan dan diverifikasi.
12. Sistem menyediakan laporan, dokumen, dan histori.

### 8.2 Status dokumen

Status awal yang disarankan:

`DRAFT → DIAJUKAN → DIVERIFIKASI → DISETUJUI → DIKONSOLIDASIKAN → DITETAPKAN`

Status alternatif:

- `DIREVISI`
- `DITOLAK`
- `DIBATALKAN`

Transisi status, aktor yang boleh melakukan tindakan, dan konsekuensi penguncian harus dikonfigurasi serta diuji. Status `DITETAPKAN` tidak boleh dapat dicapai hanya dengan perubahan status manual tanpa pemeriksaan kewenangan dan dokumen dasar.

## 9. Kebutuhan Fungsional

### 9.1 Autentikasi dan manajemen pengguna

| ID | Kebutuhan |
|---|---|
| AUTH-001 | Pengguna dapat login dengan kredensial yang valid |
| AUTH-002 | Pengguna dapat logout |
| AUTH-003 | Sistem menyediakan pengelolaan pengguna |
| AUTH-004 | Sistem menyediakan pengelolaan role dan permission |
| AUTH-005 | Sistem membatasi akses berdasarkan OPD dan penugasan |
| AUTH-006 | Sistem dapat menonaktifkan atau mengunci akun |
| AUTH-007 | Sistem mencatat waktu dan aktivitas autentikasi penting |

### 9.2 Master data

| ID | Kebutuhan |
|---|---|
| MST-001 | Mengelola tahun anggaran |
| MST-002 | Mengelola perangkat daerah dan unit kerja |
| MST-003 | Mengelola rekening berdasarkan klasifikasi yang berlaku |
| MST-004 | Mengelola program |
| MST-005 | Mengelola kegiatan |
| MST-006 | Mengelola subkegiatan |
| MST-007 | Mengelola sumber dana |
| MST-008 | Mengelola satuan |
| MST-009 | Mengelola standar harga/referensi biaya bila digunakan |
| MST-010 | Mengimpor data melalui template yang ditentukan |
| MST-011 | Memvalidasi kode, relasi, duplikasi, dan periode berlaku |
| MST-012 | Menyimpan sumber referensi dan histori perubahan master |

Master nomenklatur harus memiliki tahun atau periode berlaku. Sistem tidak boleh menganggap kode dan uraian selalu sama antar-tahun.

### 9.3 KUA-PPAS dan plafon

| ID | Kebutuhan |
|---|---|
| KUA-001 | Membuat dan mengelola dokumen KUA-PPAS sesuai ruang lingkup yang disepakati |
| KUA-002 | Mencatat plafon pada tingkat yang ditentukan |
| KUA-003 | Menghubungkan plafon dengan tahun, OPD, program, kegiatan, atau subkegiatan |
| KUA-004 | Menampilkan rekap plafon |
| KUA-005 | Menyimpan histori perubahan dan persetujuan |
| KUA-006 | Memvalidasi RKA terhadap plafon yang berlaku |

### 9.4 RKA-SKPD

| ID | Kebutuhan |
|---|---|
| RKA-001 | Membuat RKA berdasarkan tahun anggaran dan OPD |
| RKA-002 | Memilih program, kegiatan, dan subkegiatan yang valid |
| RKA-003 | Memilih rekening dan sumber dana |
| RKA-004 | Menginput uraian dan komponen rincian belanja |
| RKA-005 | Menginput volume, satuan, dan harga satuan |
| RKA-006 | Menghitung nilai rincian secara otomatis |
| RKA-007 | Menghitung rekap per rekening, subkegiatan, kegiatan, program, dan OPD |
| RKA-008 | Mengubah atau menghapus rincian selama dokumen masih dapat diedit |
| RKA-009 | Menyalin rincian atau menggunakan data tahun sebelumnya sebagai referensi dengan validasi |
| RKA-010 | Mengimpor rincian dari template Excel |
| RKA-011 | Menampilkan validasi dan peringatan pagu |
| RKA-012 | Mengajukan dokumen untuk proses verifikasi |
| RKA-013 | Menampilkan histori dan versi dokumen |
| RKA-014 | Mengekspor atau mencetak RKA sesuai template yang disahkan |

Rumus dasar:

`Jumlah = Volume × Harga Satuan`

Jika suatu rincian memiliki beberapa komponen, formula dan pembulatan mengikuti struktur komponen serta aturan resmi yang ditetapkan. Nilai harus dihitung ulang di sisi server.

### 9.5 Workflow verifikasi dan persetujuan

| ID | Kebutuhan |
|---|---|
| WF-001 | Dokumen dapat diajukan oleh pengguna berwenang |
| WF-002 | Pemeriksa dapat menyetujui, menolak, atau meminta revisi |
| WF-003 | Setiap tindakan wajib mencatat pengguna, waktu, dan catatan |
| WF-004 | Sistem memvalidasi urutan tahapan |
| WF-005 | Sistem mengirim notifikasi kepada pihak terkait |
| WF-006 | Dokumen yang terkunci tidak dapat diedit melalui jalur biasa |
| WF-007 | Revisi menghasilkan histori versi yang dapat ditelusuri |

### 9.6 APBD dan DPA

| ID | Kebutuhan |
|---|---|
| APBD-001 | Mengonsolidasikan data anggaran dari dokumen yang memenuhi syarat |
| APBD-002 | Menampilkan rekap pendapatan, belanja, dan pembiayaan sesuai cakupan data |
| APBD-003 | Menampilkan rekap per OPD, program, kegiatan, rekening, dan sumber dana |
| APBD-004 | Mencatat referensi dokumen dan tanggal penetapan |
| APBD-005 | Membedakan anggaran murni dan perubahan |
| DPA-001 | Membentuk rancangan DPA berdasarkan APBD yang telah ditetapkan |
| DPA-002 | Menyediakan DPA per OPD |
| DPA-003 | Menampilkan rincian sesuai format dokumen yang berlaku |
| DPA-004 | Menyimpan versi dan sumber APBD |
| DPA-005 | Mengunci dokumen sesuai status dan kewenangan |
| DPA-006 | Mengekspor atau mencetak DPA sesuai template yang disahkan |

### 9.7 Dashboard dan pelaporan

| ID | Kebutuhan |
|---|---|
| REP-001 | Menampilkan ringkasan anggaran berdasarkan tahun |
| REP-002 | Menampilkan total pendapatan, belanja, dan pembiayaan jika tersedia |
| REP-003 | Menampilkan pagu dan usulan per OPD |
| REP-004 | Menampilkan status dokumen RKA |
| REP-005 | Menampilkan distribusi anggaran per kategori |
| REP-006 | Menyediakan filter tahun, OPD, program, dan status |
| REP-007 | Menyediakan ekspor data sesuai hak akses |
| REP-008 | Menjamin angka dashboard konsisten dengan data sumber |

### 9.8 Audit dan dokumen

| ID | Kebutuhan |
|---|---|
| AUD-001 | Mencatat aktivitas penting pengguna |
| AUD-002 | Mencatat perubahan data penting beserta aktor dan waktunya |
| AUD-003 | Menyimpan histori persetujuan dan revisi |
| AUD-004 | Menyimpan lampiran dengan metadata dan hak akses |
| AUD-005 | Mencegah perubahan audit log melalui antarmuka aplikasi biasa |

## 10. Aturan Bisnis

1. Setiap dokumen anggaran harus terikat pada tahun anggaran.
2. RKA-SKPD harus memiliki OPD pemilik.
3. Program, kegiatan, subkegiatan, rekening, dan sumber dana harus valid untuk periode terkait.
4. Total rincian harus sama dengan hasil agregasi detail pada seluruh tingkat hierarki.
5. Validasi pagu harus dilakukan pada tingkat yang ditetapkan dalam konfigurasi anggaran, bukan hanya pada total OPD.
6. Nilai uang dan kalkulasi menggunakan tipe numerik presisi (`Decimal`), bukan floating point.
7. Data yang sudah ditetapkan tidak boleh ditimpa oleh perubahan draft.
8. Perubahan setelah persetujuan harus melalui proses revisi yang tercatat.
9. Setiap keputusan workflow harus memiliki aktor, waktu, status, dan catatan bila diperlukan.
10. Dokumen APBD dan DPA harus menyimpan referensi ke versi sumber yang digunakan.
11. Data historis tahun sebelumnya harus tetap dapat ditelusuri.
12. Pengguna hanya dapat melakukan tindakan sesuai role, OPD, dan penugasannya.
13. Import data harus menghasilkan laporan baris berhasil dan gagal beserta alasan.
14. Penghapusan data yang sudah menjadi bagian dokumen resmi harus dibatasi; gunakan pembatalan atau koreksi yang tercatat.

## 11. Kebutuhan Nonfungsional

### 11.1 Keamanan

- Password disimpan menggunakan algoritma hashing yang kuat.
- Gunakan HTTPS untuk seluruh akses produksi.
- Terapkan otorisasi di backend untuk setiap endpoint dan operasi data.
- Terapkan perlindungan terhadap CSRF, XSS, SQL injection, brute force, dan session hijacking sesuai konteks aplikasi.
- Cookie session menggunakan konfigurasi `HttpOnly`, `Secure`, dan `SameSite` yang sesuai.
- Rahasia aplikasi disimpan dalam environment/secret manager, bukan repository.
- Akses data dibatasi berdasarkan OPD dan kewenangan.
- Aktivitas sensitif dicatat dan dapat ditinjau.

### 11.2 Kinerja

Target awal yang perlu diuji pada lingkungan representatif:

- Halaman daftar umum ditampilkan dalam waktu yang wajar pada beban normal.
- Pencarian dan filter menggunakan pagination serta index database.
- Perhitungan dan penyimpanan transaksi dilakukan secara konsisten.
- Proses import besar dilakukan secara terkontrol dan memberi laporan hasil.
- Dashboard menggunakan query agregasi yang efisien atau materialized view bila diperlukan.

Target angka kinerja final ditentukan melalui uji beban berdasarkan jumlah OPD, pengguna serentak, dan volume rincian anggaran.

### 11.3 Ketersediaan dan pemulihan

- Sediakan backup database terjadwal.
- Uji proses restore secara berkala.
- Tentukan target RPO dan RTO bersama pengelola infrastruktur.
- Pisahkan lingkungan development, staging, dan production.
- Sediakan pemantauan aplikasi, database, dan kapasitas penyimpanan.
- Catat kegagalan proses dan sediakan mekanisme pemulihan.

### 11.4 Kemudahan penggunaan

- Antarmuka responsif untuk desktop dan perangkat tablet.
- Form memiliki validasi dan pesan kesalahan yang jelas.
- Tabel mendukung pencarian, filter, pengurutan, dan pagination.
- Input angka menggunakan format lokal tanpa mengubah nilai presisi di backend.
- Proses panjang menampilkan status dan umpan balik.
- Navigasi konsisten untuk seluruh modul.

### 11.5 Maintainability

- Kode menggunakan TypeScript.
- Modul bisnis dipisahkan berdasarkan domain.
- Validasi request menggunakan schema terpusat.
- Aturan bisnis ditempatkan pada service layer.
- API memiliki kontrak dan dokumentasi.
- Perubahan database menggunakan migration yang ditinjau.
- Sediakan unit test dan integration test untuk aturan kritis.

## 12. Prinsip Data dan Model Informasi

Entitas utama tahap Budgeting:

- TahunAnggaran
- OPD
- UnitKerja
- User
- Role
- Permission
- Rekening
- Program
- Kegiatan
- Subkegiatan
- SumberDana
- Satuan
- StandarHarga
- KuaPpas
- KuaPpasDetail
- Rka
- RkaProgram
- RkaKegiatan
- RkaSubkegiatan
- RkaDetail
- RkaVersion
- Apbd
- ApbdDetail
- Dpa
- DpaDetail
- WorkflowInstance
- WorkflowApproval
- DocumentAttachment
- AuditLog
- Notification

Prinsip desain data:

- Gunakan primary key yang stabil, misalnya UUID.
- Gunakan foreign key dan unique constraint.
- Simpan nilai uang menggunakan `Decimal`.
- Simpan periode berlaku master nomenklatur.
- Simpan versi dokumen dan snapshot pada titik pengesahan.
- Pisahkan data draft dari data hasil penetapan.
- Gunakan transaksi database untuk penyimpanan header dan detail.
- Jangan mempercayai total yang dikirim dari frontend; hitung ulang di backend.
- Hindari hard delete pada data yang telah dirujuk dokumen atau audit.

## 13. Integrasi

SITARIDA dibangun mandiri. Integrasi eksternal bukan prasyarat MVP kecuali telah disetujui dan spesifikasinya tersedia.

Prinsip integrasi:

1. Gunakan API resmi dan terdokumentasi.
2. Pastikan izin akses, autentikasi, dan dasar pertukaran data tersedia.
3. Tentukan sistem sumber (*source of truth*) untuk setiap jenis data.
4. Sediakan pemetaan kode dan validasi sebelum data diterima.
5. Catat waktu sinkronisasi, status, dan kesalahan.
6. Hindari asumsi bahwa endpoint atau akses SIPD RI tersedia.
7. Jangan menyatakan dokumen SITARIDA sebagai pengganti dokumen resmi tanpa dasar hukum dan persetujuan.

## 14. Desain Antarmuka dan Navigasi

Struktur menu yang direkomendasikan:

- Dashboard
- Master Data
  - Tahun Anggaran
  - Perangkat Daerah
  - Unit Kerja
  - Rekening
  - Program
  - Kegiatan
  - Subkegiatan
  - Sumber Dana
  - Standar Harga
- Perencanaan dan Penganggaran
  - KUA-PPAS
  - RKA-SKPD
  - APBD
  - DPA-SKPD
- Proses Persetujuan
  - Verifikasi Dokumen
  - Riwayat Persetujuan
- Monitoring dan Laporan
  - Monitoring Anggaran
  - Rekapitulasi per OPD
  - Rekapitulasi per Program/Kegiatan
  - Laporan RKA, APBD, dan DPA
- Administrasi
  - Pengguna
  - Role dan Permission
  - Audit Log
  - Pengaturan

Menu yang terlihat harus menyesuaikan hak akses pengguna.

## 15. Rencana Rilis dan Prioritas

### 15.1 Prioritas

- **P0 — Wajib untuk fondasi/MVP:** autentikasi, otorisasi, master data, tahun anggaran, RKA, kalkulasi, validasi, workflow, audit, dan keamanan.
- **P1 — Penyelesaian alur Budgeting:** KUA-PPAS sesuai proses yang disepakati, konsolidasi APBD, penetapan, DPA, dashboard, dan laporan.
- **P2 — Peningkatan:** import lanjutan, analitik tambahan, notifikasi lanjutan, optimasi performa, dan integrasi resmi bila tersedia.

### 15.2 Usulan sprint

Estimasi berikut merupakan rencana awal, bukan komitmen tanggal rilis.

| Sprint | Fokus | Hasil |
|---|---|---|
| 1 | Fondasi aplikasi | Repository, database, autentikasi, layout |
| 2 | Pengguna dan OPD | RBAC, pengguna, pembatasan OPD |
| 3 | Master data | Rekening dan nomenklatur |
| 4 | KUA-PPAS/plafon | Data plafon dan rekap |
| 5 | RKA dasar | Header dan hierarki RKA |
| 6 | Rincian RKA | Input komponen dan kalkulasi |
| 7 | Validasi dan workflow | Pengajuan, verifikasi, revisi |
| 8 | Konsolidasi APBD | Rekap dan pencatatan penetapan |
| 9 | DPA | Pembentukan dan dokumen DPA |
| 10 | Dashboard dan laporan | Monitoring dan ekspor |
| 11 | Pengujian/UAT | Perbaikan hasil pengujian |
| 12 | Deployment | Persiapan dan rilis produksi sesuai persetujuan |

## 16. Kriteria Penerimaan MVP

MVP dapat dinyatakan siap UAT apabila:

- Pengguna dapat login dan hanya mengakses data sesuai kewenangannya.
- Admin dapat mengelola dan mengimpor master data dengan validasi.
- Tahun dan versi nomenklatur dapat dibedakan.
- OPD dapat membuat RKA dengan struktur yang disepakati.
- Rincian anggaran dihitung dan diagregasi secara konsisten.
- Sistem memvalidasi pagu dan struktur rekening.
- Dokumen dapat diajukan, diverifikasi, direvisi, dan disetujui sesuai workflow.
- Setiap perubahan dan persetujuan tercatat.
- Data yang ditetapkan terkunci dari perubahan biasa.
- Konsolidasi dapat ditelusuri ke dokumen sumber.
- APBD dan DPA dapat dicatat/dibentuk sesuai proses serta template yang disetujui.
- Laporan dan dashboard konsisten dengan data sumber.
- Backup dan restore telah diuji.
- Tidak ada temuan keamanan kritis yang belum ditangani.
- UAT disetujui oleh perwakilan pemilik proses dan pengguna terkait.

## 17. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan regulasi | Proses dan format harus disesuaikan | Kajian regulasi dan konfigurasi yang fleksibel |
| Perubahan nomenklatur | Data lintas tahun tidak konsisten | Master berversi dan periode berlaku |
| Data awal tidak bersih | Kesalahan rekap | Template import, validasi, dan rekonsiliasi |
| Pagu tidak sesuai | Usulan anggaran tidak valid | Validasi berjenjang |
| Perubahan setelah persetujuan | Hilangnya integritas dokumen | Versioning, snapshot, dan locking |
| Hak akses terlalu luas | Kebocoran atau perubahan tidak sah | RBAC, pembatasan OPD, dan audit |
| Format dokumen berbeda | Hasil cetak tidak dapat digunakan | Validasi template dengan pemilik proses |
| Ketergantungan integrasi | Proyek tertunda | MVP dapat berjalan tanpa integrasi eksternal |
| Kapasitas infrastruktur | Kinerja menurun | Uji beban, monitoring, dan perencanaan kapasitas |
| Kedudukan aplikasi | Risiko ketidakpatuhan | Kajian dan persetujuan regulator/instansi berwenang |

## 18. Asumsi dan Hal yang Memerlukan Keputusan

Hal-hal berikut harus dikonfirmasi sebelum desain teknis dikunci:

1. Format RKA dan DPA yang harus dihasilkan.
2. Apakah cakupan RKA sejak awal meliputi pendapatan, belanja, dan pembiayaan atau dimulai dari belanja.
3. Struktur rincian belanja dan formula untuk setiap jenis belanja.
4. Tingkat penerapan pagu: OPD, program, kegiatan, subkegiatan, rekening, atau kombinasi.
5. Sumber resmi master rekening dan nomenklatur beserta pemutakhirannya.
6. Proses KUA-PPAS yang akan didukung dan batas kewenangan aplikasi.
7. Aktor, urutan, dan delegasi persetujuan.
8. Aturan anggaran murni dan perubahan.
9. Mekanisme pencatatan hasil penetapan APBD.
10. Format ekspor, tanda tangan, dan pengesahan dokumen.
11. Volume data dan jumlah pengguna serentak.
12. Kebijakan retensi, backup, RPO, dan RTO.
13. Kedudukan operasional SITARIDA terhadap SIPD RI dan persetujuan yang diperlukan.

## 19. Teknologi yang Direkomendasikan

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Form | React Hook Form + Zod |
| Backend | Next.js Route Handlers dan service layer |
| API | REST API |
| Database | PostgreSQL |
| ORM | Prisma |
| Grafik | Recharts |
| Tabel | TanStack Table |
| Autentikasi | Secure session |
| Version control | GitHub |
| Deployment | Linux, PM2, Nginx |
| Pengujian | Unit, integration, dan end-to-end testing |

### 19.1 Arsitektur

Gunakan **Modular Monolith** pada tahap awal. Setiap domain memiliki batas yang jelas, misalnya:

- `auth`
- `users`
- `master-data`
- `kua-ppas`
- `rka`
- `apbd`
- `dpa`
- `workflow`
- `reporting`
- `audit`

Setiap modul memiliki validasi, service, dan aturan bisnis sendiri. Pemisahan ini memudahkan pengembangan tanpa beban operasional microservices pada tahap awal.

## 20. Roadmap Produk Jangka Panjang

| Tahap | Modul | Hasil utama |
|---|---|---|
| Tahap 1 | Budgeting | KUA-PPAS, RKA, APBD, DPA |
| Tahap 2 | Penatausahaan | Pengelolaan pelaksanaan anggaran dan transaksi sesuai ketentuan |
| Tahap 3 | Akuntansi | Jurnal, buku besar, dan proses akuntansi |
| Tahap 4 | Pelaporan | Laporan keuangan dan laporan manajerial |
| Tahap 5 | Integrasi dan analitik | Integrasi resmi, monitoring, dan analitik lintas modul |

Setiap tahap memerlukan SRS, desain data, pengujian, dan persetujuan tersendiri sebelum dikembangkan.

## 21. Regulasi dan Referensi

Regulasi berikut menjadi titik awal kajian dan wajib diperiksa kembali status, perubahan, serta ketentuan teknis terbarunya sebelum implementasi:

- PP Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah.
- Permendagri Nomor 77 Tahun 2020 tentang Pedoman Teknis Pengelolaan Keuangan Daerah.
- Permendagri Nomor 90 Tahun 2019 tentang Klasifikasi, Kodefikasi, dan Nomenklatur Perencanaan Pembangunan dan Keuangan Daerah beserta pemutakhirannya.
- Ketentuan penyusunan APBD untuk tahun anggaran yang bersangkutan.
- Ketentuan Sistem Pemerintahan Berbasis Elektronik (SPBE).
- Kebijakan nasional mengenai penggunaan SIPD RI dan aplikasi umum pemerintahan daerah.

Referensi regulasi perlu diverifikasi melalui JDIH Kemendagri, JDIH kementerian/lembaga terkait, dan sumber resmi pemerintah. Dokumen ini bukan pendapat hukum dan tidak menetapkan SITARIDA sebagai pengganti SIPD RI.

## 22. Persetujuan Dokumen

| Peran | Nama | Tanggal | Tanda tangan |
|---|---|---|---|
| Pemilik Produk |  |  |  |
| Penanggung Jawab Proses Bisnis |  |  |  |
| Perwakilan BPKPAD |  |  |  |
| Tim Teknologi Informasi |  |  |  |
| Pimpinan/Pejabat Berwenang |  |  |  |

---

**Akhir Dokumen PRD SITARIDA**

Dokumen ini menjadi dasar diskusi kebutuhan, validasi proses bisnis, penyusunan SRS, desain database, backlog pengembangan, dan persiapan implementasi. Perubahan ruang lingkup atau aturan bisnis harus dicatat melalui proses pengendalian perubahan.
