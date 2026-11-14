import { PrismaClient } from "@prisma/client";
import { getAllCatalogPermissions } from "../src/lib/rbac-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING ROLE PERMISSIONS ===");

  // 1. Sync catalog permissions ke database
  const catalog = getAllCatalogPermissions();
  for (const item of catalog) {
    await prisma.permission.upsert({
      where: { kode: item.kode },
      update: {
        nama: item.nama,
        modul: item.modul,
        deskripsi: item.deskripsi,
      },
      create: {
        kode: item.kode,
        nama: item.nama,
        modul: item.modul,
        deskripsi: item.deskripsi,
      },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.kode, p.id]));

  // 2. Pemetaan Hak Akses per Role (Lengkap dengan Menu Navigasi & Aksi)
  const rolePermissionsConfig: Record<string, string[]> = {
    // 0: Superadmin -> Seluruh Hak Akses
    "0": allPerms.map((p) => p.kode),

    // 1: BUD (Bendahara Umum Daerah / Kuasa BUD)
    "1": [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      "penatausahaan:up:manage",
      "menu:penatausahaan:sp2d-pembuatan",
      "menu:penatausahaan:sp2d-verifikasi",
      "menu:penatausahaan:sp2d-register",
      "menu:penatausahaan:sp2d-monitoring",
      "sp2d:read",
      "sp2d:write",
      "sp2d:verify",
      "sp2d:print",
      "sp2d:register:print",
      "sp2d:monitoring:update",
      "menu:penatausahaan:bud-penerimaan",
      "menu:penatausahaan:bud-pengeluaran",
      "menu:penatausahaan:bud-bku",
      "menu:penatausahaan:bud-dth-rth",
      "menu:penatausahaan:bud-rekap-penerimaan",
      "menu:penatausahaan:bud-rekap-pengeluaran",
      "bud:read",
      "bud:write",
      "bud:print",
      "bud:dth:print",
      "menu:penatausahaan:spm",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:register:print",
      "master:read",
      "users:read",
      "audit:read",
    ],

    // 2: Bidang Anggaran
    "2": [
      "dashboard:view",
      "menu:perencanaan:plafond",
      "menu:perencanaan:rka",
      "menu:perencanaan:anggaran-kas",
      "menu:perencanaan:spd",
      "menu:perencanaan:cetak-dokumen",
      "menu:perencanaan:rka-skpd",
      "menu:perencanaan:dpa-skpd",
      "kuappas:read",
      "kuappas:manage",
      "rka:read",
      "rka:write",
      "rka:verify",
      "rka:print",
      "angkas:read",
      "angkas:write",
      "angkas:lock",
      "spd:read",
      "dpa:manage",
      "dpa:print",
      "apbd:manage",
      "apbd:print",
      "menu:master:rekening",
      "menu:master:opd",
      "menu:master:unit",
      "menu:master:program",
      "menu:master:kegiatan",
      "menu:master:subkegiatan",
      "menu:master:sumber-dana",
      "master:read",
      "master:write",
      "users:read",
      "audit:read",
    ],

    // 3: Bidang Perbendaharaan
    "3": [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      "penatausahaan:up:manage",
      "menu:penatausahaan:sp2d-pembuatan",
      "menu:penatausahaan:sp2d-verifikasi",
      "menu:penatausahaan:sp2d-register",
      "menu:penatausahaan:sp2d-monitoring",
      "sp2d:read",
      "sp2d:write",
      "sp2d:verify",
      "sp2d:print",
      "sp2d:register:print",
      "sp2d:monitoring:update",
      "menu:penatausahaan:bud-penerimaan",
      "menu:penatausahaan:bud-pengeluaran",
      "menu:penatausahaan:bud-bku",
      "menu:penatausahaan:bud-dth-rth",
      "menu:penatausahaan:bud-rekap-penerimaan",
      "menu:penatausahaan:bud-rekap-pengeluaran",
      "bud:read",
      "bud:write",
      "bud:print",
      "bud:dth:print",
      "menu:penatausahaan:spm",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:register:print",
      "master:read",
      "users:read",
    ],

    // 4: Bidang Pendapatan
    "4": [
      "dashboard:view",
      "menu:penatausahaan:bud-penerimaan",
      "menu:penatausahaan:bud-rekap-penerimaan",
      "bud:read",
      "master:read",
      "users:read",
    ],

    // 5: Bidang Akuntansi
    "5": [
      "dashboard:view",
      "menu:penatausahaan:bud-penerimaan",
      "menu:penatausahaan:bud-pengeluaran",
      "menu:penatausahaan:bud-bku",
      "menu:penatausahaan:bud-dth-rth",
      "menu:penatausahaan:bud-rekap-penerimaan",
      "menu:penatausahaan:bud-rekap-pengeluaran",
      "bud:read",
      "bud:print",
      "bud:dth:print",
      "menu:penatausahaan:sp2d-register",
      "sp2d:read",
      "sp2d:register:print",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:register:print",
      "master:read",
      "users:read",
      "audit:read",
    ],

    // 6: Bidang Aset
    "6": ["dashboard:view", "master:read", "users:read"],

    // 7: PA/KPA (Pengguna Anggaran / Kuasa Pengguna Anggaran)
    "7": [
      "dashboard:view",
      "menu:penatausahaan:pengajuan-kuitansi",
      "menu:penatausahaan:pengajuan-register",
      "kuitansi:read",
      "kuitansi:verify",
      "kuitansi:print",
      "kuitansi:register:print",
      "menu:penatausahaan:spp-register",
      "spp:read",
      "spp:print",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:print",
      "menu:perencanaan:rka",
      "menu:perencanaan:dpa-skpd",
      "rka:read",
      "rka:verify",
      "rka:print",
      "dpa:manage",
      "dpa:print",
      "master:read",
      "users:read",
    ],

    // 8: PPK (Pejabat Penatausahaan Keuangan)
    "8": [
      "dashboard:view",
      "menu:penatausahaan:spm",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:write",
      "spm:print",
      "spm:register:print",
      "menu:penatausahaan:spp-register",
      "spp:read",
      "spp:print",
      "menu:perencanaan:rka",
      "menu:perencanaan:dpa-skpd",
      "rka:read",
      "rka:write",
      "rka:verify",
      "dpa:manage",
      "master:read",
      "users:read",
    ],

    // 9: PPTK (Pejabat Pelaksana Teknis Kegiatan)
    "9": [
      "dashboard:view",
      "menu:penatausahaan:pengajuan-kuitansi",
      "menu:penatausahaan:pengajuan-register",
      "kuitansi:read",
      "kuitansi:write",
      "kuitansi:submit",
      "kuitansi:print",
      "kuitansi:register:print",
      "menu:perencanaan:rka",
      "rka:read",
      "rka:write",
      "rka:submit",
      "master:read",
      "users:read",
    ],

    // 10: Bendahara Pengeluaran
    "10": [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      "menu:penatausahaan:pengajuan-kuitansi",
      "menu:penatausahaan:pengajuan-register",
      "kuitansi:read",
      "menu:penatausahaan:spp-up",
      "menu:penatausahaan:spp-gu",
      "menu:penatausahaan:spp-tu",
      "menu:penatausahaan:spp-ls-gaji",
      "menu:penatausahaan:spp-ls-barang-jasa",
      "menu:penatausahaan:spp-up-kkpd",
      "menu:penatausahaan:spp-gu-kkpd",
      "menu:penatausahaan:spp-register",
      "spp:read",
      "spp:write",
      "spp:submit",
      "spp:print",
      "menu:penatausahaan:bendahara-pembukuan-sp2d",
      "menu:penatausahaan:bendahara-validasi-spj",
      "menu:penatausahaan:bendahara-pembukuan-spj",
      "menu:penatausahaan:bendahara-penerimaan-potongan",
      "menu:penatausahaan:bendahara-penyetoran-potongan",
      "menu:penatausahaan:bendahara-setor-sisa-kas",
      "menu:penatausahaan:bendahara-pengembalian",
      "menu:penatausahaan:bendahara-rekal-transaksi",
      "menu:penatausahaan:bendahara-lpj",
      "menu:penatausahaan:bendahara-lpj-kkpd",
      "bendahara:read",
      "bendahara:write",
      "bendahara:print",
      "master:read",
      "users:read",
    ],

    // 11: Bendahara Penerimaan
    "11": [
      "dashboard:view",
      "menu:penatausahaan:bud-penerimaan",
      "menu:penatausahaan:bud-rekap-penerimaan",
      "bud:read",
      "master:read",
      "users:read",
    ],

    // 12: Kasubag Keuangan
    "12": [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      "menu:penatausahaan:spp-register",
      "spp:read",
      "spp:print",
      "menu:penatausahaan:spm",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:write",
      "spm:print",
      "spm:register:print",
      "menu:perencanaan:rka",
      "menu:perencanaan:dpa-skpd",
      "rka:read",
      "rka:write",
      "rka:verify",
      "dpa:manage",
      "master:read",
      "users:read",
    ],

    // 13: Pengurus Barang
    "13": ["dashboard:view", "master:read", "users:read"],

    // 14: Kasubag Perencanaan
    "14": [
      "dashboard:view",
      "menu:perencanaan:plafond",
      "menu:perencanaan:rka",
      "menu:perencanaan:anggaran-kas",
      "menu:perencanaan:cetak-dokumen",
      "menu:perencanaan:rka-skpd",
      "kuappas:read",
      "kuappas:manage",
      "rka:read",
      "rka:write",
      "rka:submit",
      "rka:print",
      "angkas:read",
      "angkas:write",
      "master:read",
      "users:read",
    ],
  };

  const roles = await prisma.role.findMany();

  for (const role of roles) {
    const desiredPermKodes = rolePermissionsConfig[role.kode] || ["dashboard:view", "master:read", "rka:read"];
    console.log(`Mengonfigurasi Role [${role.kode}] ${role.nama} (${desiredPermKodes.length} permissions)...`);

    // Hapus permission lama untuk role ini
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Tambah permission baru
    for (const kode of desiredPermKodes) {
      const pId = permMap.get(kode);
      if (pId) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: pId,
          },
        });
      }
    }
  }

  console.log("=== SELESAI SEEDING ROLE PERMISSIONS ===");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
