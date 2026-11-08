import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING ROLE PERMISSIONS ===");

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.kode, p.id]));

  // Role permissions mapping
  const rolePermissionsConfig: Record<string, string[]> = {
    // 0: Superadmin -> all permissions
    "0": allPerms.map((p) => p.kode),

    // 1: BUD
    "1": ["dashboard:view", "master:read", "users:read", "rka:read", "rka:verify", "dpa:manage", "audit:read"],

    // 2: Bidang Anggaran
    "2": [
      "dashboard:view", "master:read", "master:write", "users:read",
      "kuappas:read", "kuappas:manage", "rka:read", "rka:write", "rka:verify",
      "apbd:manage", "dpa:manage", "audit:read"
    ],

    // 3: Bidang Perbendaharaan
    "3": ["dashboard:view", "master:read", "users:read", "rka:read", "dpa:manage"],

    // 4: Bidang Pendapatan
    "4": ["dashboard:view", "master:read", "users:read", "rka:read"],

    // 5: Bidang Akutansi
    "5": ["dashboard:view", "master:read", "users:read", "rka:read", "audit:read"],

    // 6: Bidang Aset
    "6": ["dashboard:view", "master:read", "users:read", "rka:read"],

    // 7: PA/KPA (Pengguna Anggaran / Kuasa Pengguna Anggaran)
    "7": ["dashboard:view", "master:read", "users:read", "rka:read", "rka:verify", "dpa:manage"],

    // 8: PPK (Pejabat Penatausahaan Keuangan)
    "8": ["dashboard:view", "master:read", "users:read", "rka:read", "rka:write", "rka:verify", "dpa:manage"],

    // 9: PPTK (Pejabat Pelaksana Teknis Kegiatan)
    "9": ["dashboard:view", "master:read", "users:read", "rka:read", "rka:write", "rka:submit"],

    // 10: Bendahara Pengeluaran
    "10": ["dashboard:view", "master:read", "users:read", "rka:read", "dpa:manage"],

    // 11: Bendahara Penerimaan
    "11": ["dashboard:view", "master:read", "users:read", "rka:read"],

    // 12: Kasubag Keuangan
    "12": ["dashboard:view", "master:read", "users:read", "rka:read", "rka:write", "rka:verify", "dpa:manage"],

    // 13: Pengurus Barang
    "13": ["dashboard:view", "master:read", "users:read", "rka:read"],

    // 14: Kasubag Perencanaan
    "14": ["dashboard:view", "master:read", "users:read", "kuappas:read", "rka:read", "rka:write", "rka:submit"],
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

