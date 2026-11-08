-- CreateEnum
CREATE TYPE "TahapAnggaran" AS ENUM ('MURNI', 'PERGESERAN', 'PERUBAHAN');

-- CreateEnum
CREATE TYPE "StatusTahunAnggaran" AS ENUM ('PERSIAPAN', 'AKTIF', 'DITUTUP');

-- CreateEnum
CREATE TYPE "KategoriRekening" AS ENUM ('PENDAPATAN', 'BELANJA', 'PEMBIAYAAN');

-- CreateEnum
CREATE TYPE "LevelRekening" AS ENUM ('AKUN', 'KELOMPOK', 'JENIS', 'OBJEK', 'RINCIAN_OBJEK', 'SUB_RINCIAN_OBJEK');

-- CreateEnum
CREATE TYPE "JenisStandarHarga" AS ENUM ('SSH', 'SBU', 'HSPK', 'ASB');

-- CreateEnum
CREATE TYPE "StatusDokumen" AS ENUM ('DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DIREVISI', 'DISETUJUI', 'DITOLAK', 'DIKONSOLIDASIKAN', 'DITETAPKAN', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "TahunAnggaran" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "tahapAktif" "TahapAnggaran" NOT NULL DEFAULT 'MURNI',
    "status" "StatusTahunAnggaran" NOT NULL DEFAULT 'PERSIAPAN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TahunAnggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opd" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "singkatan" TEXT,
    "urusanKode" TEXT,
    "urusanNama" TEXT,
    "kepalaNama" TEXT,
    "kepalaNip" TEXT,
    "kepalaJabatan" TEXT,
    "alamat" TEXT,
    "telepon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitKerja" (
    "id" TEXT NOT NULL,
    "opdId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kepalaNama" TEXT,
    "kepalaNip" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitKerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isCrossOpd" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nip" TEXT,
    "jabatan" TEXT,
    "roleId" TEXT NOT NULL,
    "opdId" TEXT,
    "unitKerjaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rekening" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "uraian" TEXT NOT NULL,
    "kategori" "KategoriRekening" NOT NULL,
    "level" "LevelRekening" NOT NULL,
    "parentKode" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT true,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rekening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "opdId" TEXT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urusanKode" TEXT,
    "bidangKode" TEXT,
    "indikator" TEXT,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "indikator" TEXT,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subkegiatan" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kinerja" TEXT,
    "indikator" TEXT,
    "satuanKeluaran" TEXT,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subkegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SumberDana" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kelompok" TEXT NOT NULL,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SumberDana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Satuan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarHarga" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "jenis" "JenisStandarHarga" NOT NULL DEFAULT 'SSH',
    "kode" TEXT NOT NULL,
    "uraianBarang" TEXT NOT NULL,
    "spesifikasi" TEXT,
    "satuanId" TEXT NOT NULL,
    "hargaSatuan" DECIMAL(18,2) NOT NULL,
    "rekeningId" TEXT,
    "sumberReferensi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandarHarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KuaPpas" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "tahap" "TahapAnggaran" NOT NULL DEFAULT 'MURNI',
    "nomorDokumen" TEXT NOT NULL,
    "tanggalDokumen" TIMESTAMP(3) NOT NULL,
    "uraian" TEXT,
    "totalPaguDaerah" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "StatusDokumen" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KuaPpas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KuaPpasDetail" (
    "id" TEXT NOT NULL,
    "kuaPpasId" TEXT NOT NULL,
    "opdId" TEXT NOT NULL,
    "paguPendapatan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paguBelanja" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paguPembiayaan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KuaPpasDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rka" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "opdId" TEXT NOT NULL,
    "unitKerjaId" TEXT,
    "tahap" "TahapAnggaran" NOT NULL DEFAULT 'MURNI',
    "nomorDokumen" TEXT NOT NULL,
    "status" "StatusDokumen" NOT NULL DEFAULT 'DRAFT',
    "totalPendapatan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBelanja" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPembiayaan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "versiAktif" INTEGER NOT NULL DEFAULT 1,
    "catatanPengajuan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkaProgram" (
    "id" TEXT NOT NULL,
    "rkaId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "totalPagu" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RkaProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkaKegiatan" (
    "id" TEXT NOT NULL,
    "rkaProgramId" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "totalPagu" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RkaKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkaSubkegiatan" (
    "id" TEXT NOT NULL,
    "rkaKegiatanId" TEXT NOT NULL,
    "subkegiatanId" TEXT NOT NULL,
    "lokasi" TEXT,
    "targetKinerja" TEXT,
    "totalPagu" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RkaSubkegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkaDetail" (
    "id" TEXT NOT NULL,
    "rkaId" TEXT NOT NULL,
    "rkaSubkegiatanId" TEXT,
    "rekeningId" TEXT NOT NULL,
    "sumberDanaId" TEXT,
    "standarHargaId" TEXT,
    "kategori" "KategoriRekening" NOT NULL DEFAULT 'BELANJA',
    "uraian" TEXT NOT NULL,
    "spesifikasi" TEXT,
    "koefisienDeskripsi" TEXT,
    "volume" DECIMAL(18,4) NOT NULL,
    "satuan" TEXT NOT NULL,
    "hargaSatuan" DECIMAL(18,2) NOT NULL,
    "pajakPersen" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "jumlah" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RkaDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkaVersion" (
    "id" TEXT NOT NULL,
    "rkaId" TEXT NOT NULL,
    "nomorVersi" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "catatan" TEXT,
    "dibuatOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RkaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "rkaId" TEXT NOT NULL,
    "statusSaatIni" "StatusDokumen" NOT NULL DEFAULT 'DRAFT',
    "tahapSaatIni" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowApproval" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tahap" INTEGER NOT NULL,
    "aksi" TEXT NOT NULL,
    "statusSebelum" "StatusDokumen" NOT NULL,
    "statusSesudah" "StatusDokumen" NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apbd" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "tahap" "TahapAnggaran" NOT NULL DEFAULT 'MURNI',
    "nomorPerda" TEXT,
    "tanggalPenetapan" TIMESTAMP(3),
    "status" "StatusDokumen" NOT NULL DEFAULT 'DRAFT',
    "totalPendapatan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBelanja" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPembiayaan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apbd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApbdDetail" (
    "id" TEXT NOT NULL,
    "apbdId" TEXT NOT NULL,
    "opdKode" TEXT NOT NULL,
    "opdNama" TEXT NOT NULL,
    "rekeningKode" TEXT NOT NULL,
    "rekeningUraian" TEXT NOT NULL,
    "kategori" "KategoriRekening" NOT NULL,
    "jumlah" DECIMAL(18,2) NOT NULL,
    "sumberRkaId" TEXT,

    CONSTRAINT "ApbdDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dpa" (
    "id" TEXT NOT NULL,
    "tahunAnggaranId" TEXT NOT NULL,
    "apbdId" TEXT NOT NULL,
    "opdId" TEXT NOT NULL,
    "nomorDpa" TEXT NOT NULL,
    "tanggalSah" TIMESTAMP(3),
    "status" "StatusDokumen" NOT NULL DEFAULT 'DRAFT',
    "totalPendapatan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBelanja" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPembiayaan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dpa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpaDetail" (
    "id" TEXT NOT NULL,
    "dpaId" TEXT NOT NULL,
    "programKode" TEXT,
    "kegiatanKode" TEXT,
    "subkegiatanKode" TEXT,
    "rekeningKode" TEXT NOT NULL,
    "rekeningUraian" TEXT NOT NULL,
    "kategori" "KategoriRekening" NOT NULL,
    "jumlah" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "DpaDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAttachment" (
    "id" TEXT NOT NULL,
    "entitasTipe" TEXT NOT NULL,
    "entitasId" TEXT NOT NULL,
    "namaFile" TEXT NOT NULL,
    "ukuranBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "urlPath" TEXT NOT NULL,
    "diunggahOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "userRole" TEXT,
    "opdId" TEXT,
    "aksi" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "deskripsi" TEXT NOT NULL,
    "dataSebelum" JSONB,
    "dataSesudah" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "tautan" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TahunAnggaran_tahun_key" ON "TahunAnggaran"("tahun");

-- CreateIndex
CREATE INDEX "TahunAnggaran_tahun_idx" ON "TahunAnggaran"("tahun");

-- CreateIndex
CREATE UNIQUE INDEX "Opd_kode_key" ON "Opd"("kode");

-- CreateIndex
CREATE INDEX "Opd_kode_idx" ON "Opd"("kode");

-- CreateIndex
CREATE INDEX "Opd_nama_idx" ON "Opd"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "UnitKerja_kode_key" ON "UnitKerja"("kode");

-- CreateIndex
CREATE INDEX "UnitKerja_opdId_idx" ON "UnitKerja"("opdId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_kode_key" ON "Role"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_kode_key" ON "Permission"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_opdId_idx" ON "User"("opdId");

-- CreateIndex
CREATE INDEX "Rekening_tahunAnggaranId_kategori_idx" ON "Rekening"("tahunAnggaranId", "kategori");

-- CreateIndex
CREATE INDEX "Rekening_kode_idx" ON "Rekening"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Rekening_tahunAnggaranId_kode_key" ON "Rekening"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE INDEX "Program_tahunAnggaranId_idx" ON "Program"("tahunAnggaranId");

-- CreateIndex
CREATE UNIQUE INDEX "Program_tahunAnggaranId_kode_key" ON "Program"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE INDEX "Kegiatan_programId_idx" ON "Kegiatan"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "Kegiatan_tahunAnggaranId_kode_key" ON "Kegiatan"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE INDEX "Subkegiatan_kegiatanId_idx" ON "Subkegiatan"("kegiatanId");

-- CreateIndex
CREATE UNIQUE INDEX "Subkegiatan_tahunAnggaranId_kode_key" ON "Subkegiatan"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "SumberDana_tahunAnggaranId_kode_key" ON "SumberDana"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "Satuan_kode_key" ON "Satuan"("kode");

-- CreateIndex
CREATE INDEX "StandarHarga_tahunAnggaranId_jenis_idx" ON "StandarHarga"("tahunAnggaranId", "jenis");

-- CreateIndex
CREATE UNIQUE INDEX "StandarHarga_tahunAnggaranId_kode_key" ON "StandarHarga"("tahunAnggaranId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "KuaPpas_tahunAnggaranId_tahap_nomorDokumen_key" ON "KuaPpas"("tahunAnggaranId", "tahap", "nomorDokumen");

-- CreateIndex
CREATE UNIQUE INDEX "KuaPpasDetail_kuaPpasId_opdId_key" ON "KuaPpasDetail"("kuaPpasId", "opdId");

-- CreateIndex
CREATE UNIQUE INDEX "Rka_tahunAnggaranId_opdId_tahap_key" ON "Rka"("tahunAnggaranId", "opdId", "tahap");

-- CreateIndex
CREATE UNIQUE INDEX "RkaProgram_rkaId_programId_key" ON "RkaProgram"("rkaId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "RkaKegiatan_rkaProgramId_kegiatanId_key" ON "RkaKegiatan"("rkaProgramId", "kegiatanId");

-- CreateIndex
CREATE UNIQUE INDEX "RkaSubkegiatan_rkaKegiatanId_subkegiatanId_key" ON "RkaSubkegiatan"("rkaKegiatanId", "subkegiatanId");

-- CreateIndex
CREATE UNIQUE INDEX "RkaVersion_rkaId_nomorVersi_key" ON "RkaVersion"("rkaId", "nomorVersi");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_rkaId_key" ON "WorkflowInstance"("rkaId");

-- CreateIndex
CREATE UNIQUE INDEX "Dpa_nomorDpa_key" ON "Dpa"("nomorDpa");

-- CreateIndex
CREATE INDEX "AuditLog_modul_createdAt_idx" ON "AuditLog"("modul", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entitas_entitasId_idx" ON "AuditLog"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "UnitKerja" ADD CONSTRAINT "UnitKerja_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rekening" ADD CONSTRAINT "Rekening_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subkegiatan" ADD CONSTRAINT "Subkegiatan_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subkegiatan" ADD CONSTRAINT "Subkegiatan_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SumberDana" ADD CONSTRAINT "SumberDana_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarHarga" ADD CONSTRAINT "StandarHarga_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarHarga" ADD CONSTRAINT "StandarHarga_satuanId_fkey" FOREIGN KEY ("satuanId") REFERENCES "Satuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarHarga" ADD CONSTRAINT "StandarHarga_rekeningId_fkey" FOREIGN KEY ("rekeningId") REFERENCES "Rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KuaPpas" ADD CONSTRAINT "KuaPpas_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KuaPpasDetail" ADD CONSTRAINT "KuaPpasDetail_kuaPpasId_fkey" FOREIGN KEY ("kuaPpasId") REFERENCES "KuaPpas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KuaPpasDetail" ADD CONSTRAINT "KuaPpasDetail_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rka" ADD CONSTRAINT "Rka_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rka" ADD CONSTRAINT "Rka_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rka" ADD CONSTRAINT "Rka_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaProgram" ADD CONSTRAINT "RkaProgram_rkaId_fkey" FOREIGN KEY ("rkaId") REFERENCES "Rka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaProgram" ADD CONSTRAINT "RkaProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaKegiatan" ADD CONSTRAINT "RkaKegiatan_rkaProgramId_fkey" FOREIGN KEY ("rkaProgramId") REFERENCES "RkaProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaKegiatan" ADD CONSTRAINT "RkaKegiatan_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaSubkegiatan" ADD CONSTRAINT "RkaSubkegiatan_rkaKegiatanId_fkey" FOREIGN KEY ("rkaKegiatanId") REFERENCES "RkaKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaSubkegiatan" ADD CONSTRAINT "RkaSubkegiatan_subkegiatanId_fkey" FOREIGN KEY ("subkegiatanId") REFERENCES "Subkegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaDetail" ADD CONSTRAINT "RkaDetail_rkaId_fkey" FOREIGN KEY ("rkaId") REFERENCES "Rka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaDetail" ADD CONSTRAINT "RkaDetail_rkaSubkegiatanId_fkey" FOREIGN KEY ("rkaSubkegiatanId") REFERENCES "RkaSubkegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaDetail" ADD CONSTRAINT "RkaDetail_rekeningId_fkey" FOREIGN KEY ("rekeningId") REFERENCES "Rekening"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaDetail" ADD CONSTRAINT "RkaDetail_sumberDanaId_fkey" FOREIGN KEY ("sumberDanaId") REFERENCES "SumberDana"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaDetail" ADD CONSTRAINT "RkaDetail_standarHargaId_fkey" FOREIGN KEY ("standarHargaId") REFERENCES "StandarHarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkaVersion" ADD CONSTRAINT "RkaVersion_rkaId_fkey" FOREIGN KEY ("rkaId") REFERENCES "Rka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_rkaId_fkey" FOREIGN KEY ("rkaId") REFERENCES "Rka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apbd" ADD CONSTRAINT "Apbd_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApbdDetail" ADD CONSTRAINT "ApbdDetail_apbdId_fkey" FOREIGN KEY ("apbdId") REFERENCES "Apbd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dpa" ADD CONSTRAINT "Dpa_tahunAnggaranId_fkey" FOREIGN KEY ("tahunAnggaranId") REFERENCES "TahunAnggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dpa" ADD CONSTRAINT "Dpa_apbdId_fkey" FOREIGN KEY ("apbdId") REFERENCES "Apbd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dpa" ADD CONSTRAINT "Dpa_opdId_fkey" FOREIGN KEY ("opdId") REFERENCES "Opd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DpaDetail" ADD CONSTRAINT "DpaDetail_dpaId_fkey" FOREIGN KEY ("dpaId") REFERENCES "Dpa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
