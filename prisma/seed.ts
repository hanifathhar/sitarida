import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai seeding database SITARIDA (ms_rek1 s/d ms_rek6, OPD, Unit, Program, Kegiatan, Subkegiatan, Sumber Dana)...");

  // 1. Seed Permissions & Roles
  const permissionsData = [
    { kode: "dashboard:view", nama: "Lihat Dashboard", modul: "reporting" },
    { kode: "master:read", nama: "Lihat Master Data & Nomenklatur", modul: "master-data" },
    { kode: "master:write", nama: "Kelola Master Data & Nomenklatur", modul: "master-data" },
    { kode: "master:import", nama: "Import Master Data & Validasi", modul: "master-data" },
    { kode: "opd:manage", nama: "Kelola Perangkat Daerah & Unit Kerja", modul: "master-data" },
    { kode: "users:read", nama: "Lihat Daftar Pengguna & Role", modul: "users" },
    { kode: "users:manage", nama: "Kelola Pengguna, Role & Permission", modul: "users" },
    { kode: "kuappas:read", nama: "Lihat Dokumen KUA-PPAS & Plafon", modul: "kua-ppas" },
    { kode: "kuappas:manage", nama: "Kelola KUA-PPAS & Plafon OPD", modul: "kua-ppas" },
    { kode: "rka:read", nama: "Lihat Dokumen RKA-SKPD", modul: "rka" },
    { kode: "rka:write", nama: "Susun & Ubah Rincian RKA-SKPD", modul: "rka" },
    { kode: "rka:submit", nama: "Ajukan RKA-SKPD", modul: "workflow" },
    { kode: "rka:verify", nama: "Verifikasi & Setujui RKA-SKPD", modul: "workflow" },
    { kode: "apbd:manage", nama: "Konsolidasi & Penetapan APBD", modul: "apbd" },
    { kode: "dpa:manage", nama: "Pembentukan & Pengesahan DPA-SKPD", modul: "dpa" },
    { kode: "audit:read", nama: "Lihat Jejak Audit (Audit Log)", modul: "audit" },
  ];

  const permissionMap: Record<string, string> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { kode: p.kode },
      update: p,
      create: p,
    });
    permissionMap[p.kode] = perm.id;
  }

  const rolesData = [
    {
      kode: "SUPERADMIN",
      nama: "Superadmin",
      deskripsi: "Konfigurasi sistem, pengguna, role, dan parameter global",
      isCrossOpd: true,
      perms: Object.keys(permissionMap),
    },
    {
      kode: "ADMIN_BPKPAD",
      nama: "Admin BPKPAD",
      deskripsi: "Administrasi master data dan proses penganggaran sesuai penugasan",
      isCrossOpd: true,
      perms: [
        "dashboard:view",
        "master:read",
        "master:write",
        "master:import",
        "opd:manage",
        "users:read",
        "users:manage",
        "kuappas:read",
        "kuappas:manage",
        "rka:read",
        "rka:verify",
        "apbd:manage",
        "dpa:manage",
        "audit:read",
      ],
    },
    {
      kode: "PIMPINAN_BPKPAD",
      nama: "Pimpinan BPKPAD",
      deskripsi: "Monitoring dan keputusan sesuai kewenangan",
      isCrossOpd: true,
      perms: [
        "dashboard:view",
        "master:read",
        "kuappas:read",
        "rka:read",
        "rka:verify",
        "apbd:manage",
        "dpa:manage",
        "audit:read",
      ],
    },
    {
      kode: "TAPD",
      nama: "TAPD",
      deskripsi: "Pembahasan, evaluasi, dan konsolidasi anggaran sesuai penugasan",
      isCrossOpd: true,
      perms: [
        "dashboard:view",
        "master:read",
        "kuappas:read",
        "kuappas:manage",
        "rka:read",
        "rka:verify",
        "apbd:manage",
      ],
    },
    {
      kode: "ADMIN_OPD",
      nama: "Admin OPD",
      deskripsi: "Administrasi data dan pengguna pada OPD serta pengajuan RKA",
      isCrossOpd: false,
      perms: [
        "dashboard:view",
        "master:read",
        "master:write",
        "opd:manage",
        "users:read",
        "users:manage",
        "kuappas:read",
        "rka:read",
        "rka:write",
        "rka:submit",
      ],
    },
    {
      kode: "KEPALA_OPD",
      nama: "Kepala OPD",
      deskripsi: "Peninjauan dan persetujuan usulan OPD sesuai kewenangan",
      isCrossOpd: false,
      perms: ["dashboard:view", "master:read", "kuappas:read", "rka:read", "rka:submit"],
    },
    {
      kode: "PPK_SKPD",
      nama: "PPK-SKPD",
      deskripsi: "Pemeriksaan dokumen RKA/DPA sesuai tugas dan kewenangan",
      isCrossOpd: false,
      perms: ["dashboard:view", "master:read", "kuappas:read", "rka:read"],
    },
    {
      kode: "PPTK",
      nama: "PPTK",
      deskripsi: "Penyusunan rincian kegiatan dan anggaran sesuai penugasan",
      isCrossOpd: false,
      perms: [
        "dashboard:view",
        "master:read",
        "kuappas:read",
        "rka:read",
        "rka:write",
        "rka:submit",
      ],
    },
    {
      kode: "VIEWER_AUDITOR",
      nama: "Viewer / Auditor",
      deskripsi: "Melihat data, laporan, atau audit log sesuai hak akses",
      isCrossOpd: true,
      perms: ["dashboard:view", "master:read", "kuappas:read", "rka:read", "audit:read"],
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { kode: r.kode },
      update: { nama: r.nama, deskripsi: r.deskripsi, isCrossOpd: r.isCrossOpd },
      create: { kode: r.kode, nama: r.nama, deskripsi: r.deskripsi, isCrossOpd: r.isCrossOpd },
    });
    roleMap[r.kode] = role.id;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: r.perms.map((pKode) => ({
        roleId: role.id,
        permissionId: permissionMap[pKode],
      })),
      skipDuplicates: true,
    });
  }

  // 2. Seed Tahun Anggaran (2025 & 2026)
  const ta2025 = await prisma.tahunAnggaran.upsert({
    where: { tahun: 2025 },
    update: {},
    create: {
      tahun: 2025,
      nama: "Tahun Anggaran 2025",
      tahapAktif: "PERUBAHAN",
      status: "DITUTUP",
      isDefault: false,
      keterangan: "Data historis APBD Kabupaten Tapanuli Selatan TA 2025",
    },
  });

  const ta2026 = await prisma.tahunAnggaran.upsert({
    where: { tahun: 2026 },
    update: { isDefault: true, status: "AKTIF" },
    create: {
      tahun: 2026,
      nama: "Tahun Anggaran 2026",
      tahapAktif: "MURNI",
      status: "AKTIF",
      isDefault: true,
      keterangan: "Penyusunan APBD Murni Kabupaten Tapanuli Selatan TA 2026",
    },
  });

  // 3. Seed OPD & Unit Kerja
  const opdList = [
    {
      kd_skpd: "5.02.0.00.0.00.01.0000",
      nm_skpd: "Badan Pengelolaan Keuangan, Pendapatan dan Aset Daerah",
      singkatan: "BPKPAD",
      kd_urusan: "5.02",
      nm_urusan: "Urusan Pemerintahan Fungsi Penunjang Keuangan",
      kepalaNama: "Drs. M. Frananda, S.E., M.M.",
      kepalaNip: "197405121999031004",
      kepalaJabatan: "Kepala BPKPAD",
      alamat: "Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok",
    },
    {
      kd_skpd: "1.01.0.00.0.00.01.0000",
      nm_skpd: "Dinas Pendidikan Daerah",
      singkatan: "DISDIK",
      kd_urusan: "1.01",
      nm_urusan: "Urusan Pemerintahan Bidang Pendidikan",
      kepalaNama: "Arman Pasaribu, S.Pd., M.Si.",
      kepalaNip: "197208141998021002",
      kepalaJabatan: "Kepala Dinas Pendidikan Daerah",
      alamat: "Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok",
    },
    {
      kd_skpd: "1.02.0.00.0.00.01.0000",
      nm_skpd: "Dinas Kesehatan",
      singkatan: "DINKES",
      kd_urusan: "1.02",
      nm_urusan: "Urusan Pemerintahan Bidang Kesehatan",
      kepalaNama: "dr. Sri Khairunnisa, M.K.M.",
      kepalaNip: "197811032005022001",
      kepalaJabatan: "Kepala Dinas Kesehatan",
      alamat: "Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok",
    },
    {
      kd_skpd: "1.03.0.00.0.00.01.0000",
      nm_skpd: "Dinas Pekerjaan Umum dan Penataan Ruang",
      singkatan: "PUPR",
      kd_urusan: "1.03",
      nm_urusan: "Urusan Pemerintahan Bidang Pekerjaan Umum dan Penataan Ruang",
      kepalaNama: "Ir. Fachri Ananda Harahap, S.T., M.T.",
      kepalaNip: "197604212002121003",
      kepalaJabatan: "Kepala Dinas PUPR",
      alamat: "Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok",
    },
    {
      kd_skpd: "5.01.0.00.0.00.01.0000",
      nm_skpd: "Badan Perencanaan Pembangunan Daerah",
      singkatan: "BAPPEDA",
      kd_urusan: "5.01",
      nm_urusan: "Urusan Pemerintahan Fungsi Penunjang Perencanaan",
      kepalaNama: "Chairul Rizal Lubis, S.Sos., M.M.",
      kepalaNip: "197509192000031005",
      kepalaJabatan: "Kepala Bappeda",
      alamat: "Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok",
    },
  ];

  const opdMap: Record<string, string> = {};
  for (const o of opdList) {
    const opd = await prisma.opd.upsert({
      where: { kd_skpd: o.kd_skpd },
      update: o,
      create: o,
    });
    opdMap[o.singkatan!] = opd.id;
  }

  const unitList = [
    {
      opdId: opdMap["BPKPAD"],
      kd_unit: "5.02.0.00.0.00.01.0001",
      nm_unit: "Bidang Anggaran BPKPAD",
      kepalaNama: "Rizky Siregar, S.E.",
      kepalaNip: "198401102009011002",
      alamat: "Gedung BPKPAD Lt. 2, Sipirok",
    },
    {
      opdId: opdMap["BPKPAD"],
      kd_unit: "5.02.0.00.0.00.01.0002",
      nm_unit: "Bidang Perbendaharaan dan Kas Daerah",
      kepalaNama: "Hendra Gunawan, S.E., M.Si.",
      kepalaNip: "198305192008011005",
      alamat: "Gedung BPKPAD Lt. 1, Sipirok",
    },
    {
      opdId: opdMap["DISDIK"],
      kd_unit: "1.01.0.00.0.00.01.0001",
      nm_unit: "Bidang Pembinaan Sekolah Dasar",
      kepalaNama: "Syahrul Dalimunthe, S.Pd.",
      kepalaNip: "198207152008011004",
      alamat: "Dinas Pendidikan, Sipirok",
    },
    {
      opdId: opdMap["DINKES"],
      kd_unit: "1.02.0.00.0.00.01.0001",
      nm_unit: "UPT RSUD Sipirok",
      kepalaNama: "dr. Halomoan Nasution",
      kepalaNip: "198002192007011003",
      alamat: "Jl. Kesehatan No. 1, Sipirok",
    },
  ];

  for (const u of unitList) {
    await prisma.unitKerja.upsert({
      where: { kd_unit: u.kd_unit },
      update: u,
      create: u,
    });
  }

  // 4. Seed Users (Password: sitarida123)
  const passwordHash = await bcrypt.hash("sitarida123", 10);
  const usersData = [
    {
      username: "superadmin",
      email: "superadmin@tapselkab.go.id",
      namaLengkap: "Administrator Utama SITARIDA",
      nip: "199001012015031001",
      jabatan: "System Administrator",
      roleId: roleMap["SUPERADMIN"],
      opdId: null,
    },
    {
      username: "admin.bpkpad",
      email: "anggaran.bpkpad@tapselkab.go.id",
      namaLengkap: "Ahmad Fauzi Harahap, S.E.",
      nip: "198503122010011008",
      jabatan: "Kasubbid Anggaran BPKPAD",
      roleId: roleMap["ADMIN_BPKPAD"],
      opdId: opdMap["BPKPAD"],
    },
    {
      username: "ketua.tapd",
      email: "tapd@tapselkab.go.id",
      namaLengkap: "Sofyan Adil, S.IP., M.Si.",
      nip: "197106101996031002",
      jabatan: "Koordinator TAPD Kab. Tapanuli Selatan",
      roleId: roleMap["TAPD"],
      opdId: opdMap["BPKPAD"],
    },
    {
      username: "admin.disdik",
      email: "perencanaan.disdik@tapselkab.go.id",
      namaLengkap: "Nurhalimah Lubis, S.Kom.",
      nip: "198911202014022003",
      jabatan: "Kasubbag Perencanaan Dinas Pendidikan",
      roleId: roleMap["ADMIN_OPD"],
      opdId: opdMap["DISDIK"],
    },
    {
      username: "kadis.disdik",
      email: "kadis.disdik@tapselkab.go.id",
      namaLengkap: "Arman Pasaribu, S.Pd., M.Si.",
      nip: "197208141998021002",
      jabatan: "Kepala Dinas Pendidikan Daerah",
      roleId: roleMap["KEPALA_OPD"],
      opdId: opdMap["DISDIK"],
    },
    {
      username: "pptk.disdik",
      email: "pptk.disdik@tapselkab.go.id",
      namaLengkap: "Syahrul Dalimunthe, S.Pd.",
      nip: "198207152008011004",
      jabatan: "PPTK Bidang Pembinaan SD",
      roleId: roleMap["PPTK"],
      opdId: opdMap["DISDIK"],
    },
    {
      username: "admin.dinkes",
      email: "perencanaan.dinkes@tapselkab.go.id",
      namaLengkap: "Fitriani Siregar, S.K.M.",
      nip: "199104122015032005",
      jabatan: "Pengelola Program & Anggaran Dinkes",
      roleId: roleMap["ADMIN_OPD"],
      opdId: opdMap["DINKES"],
    },
    {
      username: "auditor.inspektorat",
      email: "auditor@tapselkab.go.id",
      namaLengkap: "Parlindungan Hutasuhut, S.E., Ak.",
      nip: "198109252006041004",
      jabatan: "Auditor Muda Inspektorat Daerah",
      roleId: roleMap["VIEWER_AUDITOR"],
      opdId: null,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { namaLengkap: u.namaLengkap, roleId: u.roleId, opdId: u.opdId },
      create: { ...u, passwordHash, isActive: true },
    });
  }

  // 5. Seed Program, Kegiatan, Subkegiatan & Sumber Dana
  const progKeu = await prisma.program.upsert({
    where: { kd_program: "5.02.02" },
    update: {},
    create: {
      kd_program: "5.02.02",
      nm_program: "PROGRAM PENGELOLAAN KEUANGAN DAERAH",
      kd_urusan: "5.02",
    },
  });

  const kegKeu = await prisma.kegiatan.upsert({
    where: { kd_kegiatan: "5.02.02.2.01" },
    update: {},
    create: {
      programId: progKeu.id,
      kd_kegiatan: "5.02.02.2.01",
      nm_kegiatan: "Koordinasi dan Penyusunan Rencana Anggaran Daerah",
    },
  });

  await prisma.subkegiatan.upsert({
    where: { kd_sub_kegiatan: "5.02.02.2.01.0001" },
    update: {},
    create: {
      kegiatanId: kegKeu.id,
      kd_sub_kegiatan: "5.02.02.2.01.0001",
      nm_sub_kegiatan: "Koordinasi dan Penyusunan KUA dan PPAS",
    },
  });

  await prisma.subkegiatan.upsert({
    where: { kd_sub_kegiatan: "5.02.02.2.01.0004" },
    update: {},
    create: {
      kegiatanId: kegKeu.id,
      kd_sub_kegiatan: "5.02.02.2.01.0004",
      nm_sub_kegiatan: "Koordinasi, Asistensi, dan Verifikasi RKA-SKPD serta Penyusunan DPA-SKPD",
    },
  });

  const progDisdik = await prisma.program.upsert({
    where: { kd_program: "1.01.02" },
    update: {},
    create: {
      kd_program: "1.01.02",
      nm_program: "PROGRAM PENGELOLAAN PENDIDIKAN",
      kd_urusan: "1.01",
    },
  });

  const kegDisdik = await prisma.kegiatan.upsert({
    where: { kd_kegiatan: "1.01.02.2.01" },
    update: {},
    create: {
      programId: progDisdik.id,
      kd_kegiatan: "1.01.02.2.01",
      nm_kegiatan: "Pengelolaan Pendidikan Sekolah Dasar",
    },
  });

  await prisma.subkegiatan.upsert({
    where: { kd_sub_kegiatan: "1.01.02.2.01.0006" },
    update: {},
    create: {
      kegiatanId: kegDisdik.id,
      kd_sub_kegiatan: "1.01.02.2.01.0006",
      nm_sub_kegiatan: "Rehabilitasi Sedang/Berat Ruang Kelas Sekolah Dasar",
    },
  });

  // 6. Seed Sumber Dana
  const sumberDanas = [
    { kd_sumdan: "1.1.01", nm_sumdan: "Pendapatan Asli Daerah (PAD)" },
    { kd_sumdan: "1.2.01.01", nm_sumdan: "Dana Alokasi Umum (DAU) - Block Grant" },
    { kd_sumdan: "1.2.01.02", nm_sumdan: "Dana Alokasi Umum (DAU) - Bidang Pendidikan" },
    { kd_sumdan: "1.2.02.01", nm_sumdan: "Dana Alokasi Khusus (DAK) Fisik" },
    { kd_sumdan: "1.2.02.02", nm_sumdan: "Dana Alokasi Khusus (DAK) Nonfisik" },
    { kd_sumdan: "1.2.03.01", nm_sumdan: "Dana Bagi Hasil (DBH) Pajak & SDA" },
  ];

  for (const sd of sumberDanas) {
    await prisma.sumberDana.upsert({
      where: { kd_sumdan: sd.kd_sumdan },
      update: sd,
      create: sd,
    });
  }

  console.log("Seeding database SITARIDA selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
