import { PrismaClient } from "@prisma/client";
import { getAllCatalogPermissions } from "../src/lib/rbac-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. SYNC CATALOG PERMISSIONS TO DATABASE ===");
  const catalog = getAllCatalogPermissions();
  console.log(`Total permissions defined in catalog: ${catalog.length}`);

  let upsertCount = 0;
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
    upsertCount++;
  }
  console.log(`Successfully synced ${upsertCount} permissions to DB.`);

  console.log("\n=== 2. VERIFY ALL APPSHELL PERMISSIONS IN DATABASE ===");
  const allDbPerms = await prisma.permission.findMany();
  const permMap = new Map(allDbPerms.map((p) => [p.kode, p.id]));
  console.log(`Total permissions currently in database: ${allDbPerms.length}`);

  // 3. Update Superadmin to have ALL permissions
  const superadminRole = await prisma.role.findFirst({
    where: { OR: [{ kode: "0" }, { kode: "SUPERADMIN" }] },
  });

  if (superadminRole) {
    console.log(`\nAssigning ALL ${allDbPerms.length} permissions to Superadmin (${superadminRole.nama})...`);
    await prisma.rolePermission.deleteMany({ where: { roleId: superadminRole.id } });
    await prisma.rolePermission.createMany({
      data: allDbPerms.map((p) => ({
        roleId: superadminRole.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });
    console.log("Superadmin role permissions updated.");
  }

  // 4. Update PPTK (Role 9)
  const pptkRole = await prisma.role.findFirst({
    where: { OR: [{ kode: "9" }, { nama: { contains: "PPTK" } }] },
  });
  if (pptkRole) {
    const pptkPermKodes = [
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
    ];
    console.log(`\nConfiguring PPTK Role (${pptkRole.nama})...`);
    for (const kode of pptkPermKodes) {
      const pId = permMap.get(kode);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: pptkRole.id, permissionId: pId } },
          update: {},
          create: { roleId: pptkRole.id, permissionId: pId },
        });
      }
    }
    console.log("PPTK role permissions updated.");
  }

  // 5. Update PA/KPA (Role 7)
  const paKpaRole = await prisma.role.findFirst({
    where: { OR: [{ kode: "7" }, { nama: { contains: "PA/KPA" } }] },
  });
  if (paKpaRole) {
    const paKpaPermKodes = [
      "dashboard:view",
      "menu:penatausahaan:pengajuan-kuitansi",
      "menu:penatausahaan:pengajuan-register",
      "kuitansi:read",
      "kuitansi:verify",
      "kuitansi:print",
      "kuitansi:register:print",
      "menu:perencanaan:rka",
      "menu:perencanaan:dpa-skpd",
      "rka:read",
      "rka:verify",
      "rka:print",
      "dpa:manage",
      "dpa:print",
      "master:read",
      "users:read",
    ];
    console.log(`\nConfiguring PA/KPA Role (${paKpaRole.nama})...`);
    for (const kode of paKpaPermKodes) {
      const pId = permMap.get(kode);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: paKpaRole.id, permissionId: pId } },
          update: {},
          create: { roleId: paKpaRole.id, permissionId: pId },
        });
      }
    }
    console.log("PA/KPA role permissions updated.");
  }

  // 6. Update Bendahara Pengeluaran (Role 10)
  const bendaharaRole = await prisma.role.findFirst({
    where: { OR: [{ kode: "10" }, { nama: { contains: "Bendahara Pengeluaran" } }] },
  });
  if (bendaharaRole) {
    const bendaharaPermKodes = [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      // SPP
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
      // Bendahara Pengeluaran
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
      // Pengajuan Kuitansi
      "menu:penatausahaan:pengajuan-kuitansi",
      "menu:penatausahaan:pengajuan-register",
      "kuitansi:read",
      "master:read",
      "users:read",
    ];
    console.log(`\nConfiguring Bendahara Pengeluaran Role (${bendaharaRole.nama})...`);
    for (const kode of bendaharaPermKodes) {
      const pId = permMap.get(kode);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: bendaharaRole.id, permissionId: pId } },
          update: {},
          create: { roleId: bendaharaRole.id, permissionId: pId },
        });
      }
    }
    console.log("Bendahara Pengeluaran role permissions updated.");
  }

  // 7. Update BUD (Role 1)
  const budRole = await prisma.role.findFirst({
    where: { OR: [{ kode: "1" }, { nama: "BUD" }] },
  });
  if (budRole) {
    const budPermKodes = [
      "dashboard:view",
      "menu:penatausahaan:pengaturan",
      "penatausahaan:up:read",
      "penatausahaan:up:manage",
      // SP2D
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
      // BUD
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
      // SPM (read)
      "menu:penatausahaan:spm",
      "menu:penatausahaan:spm-register",
      "spm:read",
      "spm:register:print",
      "master:read",
      "users:read",
      "audit:read",
    ];
    console.log(`\nConfiguring BUD Role (${budRole.nama})...`);
    for (const kode of budPermKodes) {
      const pId = permMap.get(kode);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: budRole.id, permissionId: pId } },
          update: {},
          create: { roleId: budRole.id, permissionId: pId },
        });
      }
    }
    console.log("BUD role permissions updated.");
  }

  console.log("\n=== ALL SYNC AND PERMISSION UPDATES FINISHED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Error running sync script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

