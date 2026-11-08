import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { getOpdFilter, getUnitFilter } from "@/lib/rbac";
import { recordAuditLog } from "@/modules/audit/audit.service";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  tahunAnggaranSchema,
  msRek1Schema,
  msRek2Schema,
  msRek3Schema,
  msRek4Schema,
  msRek5Schema,
  msRek6Schema,
  opdSchema,
  unitKerjaSchema,
  programSchema,
  kegiatanSchema,
  subkegiatanSchema,
  sumberDanaSchema,
} from "./master-data.schema";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getPagination(page?: number, limit?: number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(5000, Math.max(5, Number(limit) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
}

// ==========================================
// 1. TAHUN ANGGARAN (ms_tahun_anggaran)
// ==========================================

export async function listTahunAnggaran() {
  return prisma.tahunAnggaran.findMany({
    orderBy: { tahun: "desc" },
  });
}

export async function getActiveTahunAnggaran(preferredId?: string | null) {
  if (preferredId) {
    const found = await prisma.tahunAnggaran.findUnique({ where: { id: preferredId } });
    if (found) return found;
  }
  const def = await prisma.tahunAnggaran.findFirst({
    where: { OR: [{ isDefault: true }, { status: "AKTIF" }] },
    orderBy: [{ isDefault: "desc" }, { tahun: "desc" }],
  });
  if (def) return def;
  return prisma.tahunAnggaran.findFirst({ orderBy: { tahun: "desc" } });
}

export async function createTahunAnggaran(
  session: SessionPayload,
  input: z.infer<typeof tahunAnggaranSchema>
) {
  const existing = await prisma.tahunAnggaran.findUnique({ where: { tahun: input.tahun } });
  if (existing) throw new Error(`Tahun Anggaran ${input.tahun} sudah terdaftar.`);

  if (input.isDefault) {
    await prisma.tahunAnggaran.updateMany({ data: { isDefault: false } });
  }

  const created = await prisma.tahunAnggaran.create({ data: input });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_tahun_anggaran",
    entitasId: created.id,
    deskripsi: `Menambahkan Tahun Anggaran ${created.tahun} (${created.nama})`,
    dataSesudah: created,
  });

  return created;
}

export async function updateTahunAnggaran(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof tahunAnggaranSchema>>
) {
  const existing = await prisma.tahunAnggaran.findUnique({ where: { id } });
  if (!existing) throw new Error("Tahun Anggaran tidak ditemukan.");

  if (input.isDefault) {
    await prisma.tahunAnggaran.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.tahunAnggaran.update({ where: { id }, data: input });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_tahun_anggaran",
    entitasId: updated.id,
    deskripsi: `Memperbarui Tahun Anggaran ${updated.tahun}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteTahunAnggaran(session: SessionPayload, id: string) {
  const existing = await prisma.tahunAnggaran.findUnique({ where: { id } });
  if (!existing) throw new Error("Tahun Anggaran tidak ditemukan.");
  if (existing.isDefault) {
    throw new Error("Tahun Anggaran Default tidak dapat dihapus. Ubah default ke tahun lain terlebih dahulu.");
  }

  await prisma.tahunAnggaran.delete({ where: { id } });

  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "master-data",
    entitas: "ms_tahun_anggaran",
    entitasId: id,
    deskripsi: `Menghapus Tahun Anggaran ${existing.tahun} (${existing.nama})`,
    dataSebelum: existing,
  });

  return true;
}

// ==========================================
// 2. MASTER REKENING 6 LEVEL (ms_rek1 s/d ms_rek6)
// ==========================================

export async function listMsRek(params: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  search?: string;
  parentId?: string;
  kategori?: string;
  rkaOnly?: boolean;
  prefix?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = getPagination(params.page, params.limit);
  const q = params.search?.trim();

  if (params.level === 1) {
    const where: Prisma.MsRek1WhereInput = {};
    if (params.kategori) {
      where.kategori = params.kategori;
    }
    if (q) {
      where.OR = [
        { kd_rek1: { contains: q, mode: "insensitive" } },
        { nm_rek1: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.msRek1.findMany({
        where,
        include: { _count: { select: { rek2s: true } } },
        orderBy: { kd_rek1: "asc" },
        skip,
        take: limit,
      }),
      prisma.msRek1.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (params.level === 2) {
    const where: Prisma.MsRek2WhereInput = {};
    if (params.parentId) where.rek1Id = params.parentId;
    if (q) {
      where.OR = [
        { kd_rek2: { contains: q, mode: "insensitive" } },
        { nm_rek2: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.msRek2.findMany({
        where,
        include: { rek1: true, _count: { select: { rek3s: true } } },
        orderBy: { kd_rek2: "asc" },
        skip,
        take: limit,
      }),
      prisma.msRek2.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (params.level === 3) {
    const where: Prisma.MsRek3WhereInput = {};
    if (params.parentId) where.rek2Id = params.parentId;
    if (q) {
      where.OR = [
        { kd_rek3: { contains: q, mode: "insensitive" } },
        { nm_rek3: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.msRek3.findMany({
        where,
        include: { rek2: true, _count: { select: { rek4s: true } } },
        orderBy: { kd_rek3: "asc" },
        skip,
        take: limit,
      }),
      prisma.msRek3.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (params.level === 4) {
    const where: Prisma.MsRek4WhereInput = {};
    if (params.parentId) where.rek3Id = params.parentId;
    if (q) {
      where.OR = [
        { kd_rek4: { contains: q, mode: "insensitive" } },
        { nm_rek4: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.msRek4.findMany({
        where,
        include: { rek3: true, _count: { select: { rek5s: true } } },
        orderBy: { kd_rek4: "asc" },
        skip,
        take: limit,
      }),
      prisma.msRek4.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (params.level === 5) {
    const where: Prisma.MsRek5WhereInput = {};
    if (params.parentId) where.rek4Id = params.parentId;
    if (q) {
      where.OR = [
        { kd_rek5: { contains: q, mode: "insensitive" } },
        { nm_rek5: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.msRek5.findMany({
        where,
        include: { rek4: true, _count: { select: { rek6s: true } } },
        orderBy: { kd_rek5: "asc" },
        skip,
        take: limit,
      }),
      prisma.msRek5.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Level 6 (ms_rek6)
  const andList: Prisma.MsRek6WhereInput[] = [];
  if (params.parentId) andList.push({ rek5Id: params.parentId });
  if (params.rkaOnly) {
    andList.push({
      OR: [
        { kd_rek6: { startsWith: "4" } },
        { kd_rek6: { startsWith: "5" } },
        { kd_rek6: { startsWith: "6" } },
      ],
    });
  } else if (params.prefix) {
    andList.push({ kd_rek6: { startsWith: params.prefix } });
  }

  if (q) {
    andList.push({
      OR: [
        { kd_rek6: { contains: q, mode: "insensitive" } },
        { nm_rek6: { contains: q, mode: "insensitive" } },
        { map_lo: { contains: q, mode: "insensitive" } },
        { map_utang: { contains: q, mode: "insensitive" } },
        { map_aset: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.MsRek6WhereInput = andList.length > 0 ? { AND: andList } : {};
  const [items, total] = await Promise.all([
    prisma.msRek6.findMany({
      where,
      include: { rek5: true },
      orderBy: { kd_rek6: "asc" },
      skip,
      take: limit,
    }),
    prisma.msRek6.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function normalizeRekPayload(level: 1 | 2 | 3 | 4 | 5 | 6, payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  const copy = { ...payload };
  const kdKey = `kd_rek${level}`;
  const nmKey = `nm_rek${level}`;
  if (copy[kdKey] === undefined && copy.kode !== undefined) copy[kdKey] = copy.kode;
  if (copy[nmKey] === undefined && copy.uraian !== undefined) copy[nmKey] = copy.uraian;
  return copy;
}

export async function createMsRek(
  session: SessionPayload,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  payload: unknown
) {
  const entitasName = `ms_rek${level}`;
  const norm = normalizeRekPayload(level, payload);

  if (level === 1) {
    const data = msRek1Schema.parse(norm);
    const created = await prisma.msRek1.create({ data });
    await recordAuditLog({
      session,
      aksi: "CREATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: created.id,
      deskripsi: `Menambahkan ${entitasName} [${created.kd_rek1}] ${created.nm_rek1}`,
      dataSesudah: created,
    });
    return created;
  }
  if (level === 2) {
    const data = msRek2Schema.parse(norm);
    const created = await prisma.msRek2.create({ data });
    await recordAuditLog({
      session,
      aksi: "CREATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: created.id,
      deskripsi: `Menambahkan ${entitasName} [${created.kd_rek2}] ${created.nm_rek2}`,
      dataSesudah: created,
    });
    return created;
  }
  if (level === 3) {
    const data = msRek3Schema.parse(norm);
    const created = await prisma.msRek3.create({ data });
    await recordAuditLog({
      session,
      aksi: "CREATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: created.id,
      deskripsi: `Menambahkan ${entitasName} [${created.kd_rek3}] ${created.nm_rek3}`,
      dataSesudah: created,
    });
    return created;
  }
  if (level === 4) {
    const data = msRek4Schema.parse(norm);
    const created = await prisma.msRek4.create({ data });
    await recordAuditLog({
      session,
      aksi: "CREATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: created.id,
      deskripsi: `Menambahkan ${entitasName} [${created.kd_rek4}] ${created.nm_rek4}`,
      dataSesudah: created,
    });
    return created;
  }
  if (level === 5) {
    const data = msRek5Schema.parse(norm);
    const created = await prisma.msRek5.create({ data });
    await recordAuditLog({
      session,
      aksi: "CREATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: created.id,
      deskripsi: `Menambahkan ${entitasName} [${created.kd_rek5}] ${created.nm_rek5}`,
      dataSesudah: created,
    });
    return created;
  }
  const data = msRek6Schema.parse(norm);
  const created = await prisma.msRek6.create({ data });
  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: entitasName,
    entitasId: created.id,
    deskripsi: `Menambahkan ${entitasName} [${created.kd_rek6}] ${created.nm_rek6}`,
    dataSesudah: created,
  });
  return created;
}

export async function updateMsRek(
  session: SessionPayload,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  id: string,
  payload: unknown
) {
  const entitasName = `ms_rek${level}`;
  const norm = normalizeRekPayload(level, payload);

  if (level === 1) {
    const data = msRek1Schema.partial().parse(norm);
    const updated = await prisma.msRek1.update({ where: { id }, data });
    await recordAuditLog({
      session,
      aksi: "UPDATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek1}] ${updated.nm_rek1}`,
      dataSesudah: updated,
    });
    return updated;
  }
  if (level === 2) {
    const data = msRek2Schema.partial().parse(norm);
    const updated = await prisma.msRek2.update({ where: { id }, data });
    await recordAuditLog({
      session,
      aksi: "UPDATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek2}] ${updated.nm_rek2}`,
      dataSesudah: updated,
    });
    return updated;
  }
  if (level === 3) {
    const data = msRek3Schema.partial().parse(norm);
    const updated = await prisma.msRek3.update({ where: { id }, data });
    await recordAuditLog({
      session,
      aksi: "UPDATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek3}] ${updated.nm_rek3}`,
      dataSesudah: updated,
    });
    return updated;
  }
  if (level === 4) {
    const data = msRek4Schema.partial().parse(norm);
    const updated = await prisma.msRek4.update({ where: { id }, data });
    await recordAuditLog({
      session,
      aksi: "UPDATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek4}] ${updated.nm_rek4}`,
      dataSesudah: updated,
    });
    return updated;
  }
  if (level === 5) {
    const data = msRek5Schema.partial().parse(norm);
    const updated = await prisma.msRek5.update({ where: { id }, data });
    await recordAuditLog({
      session,
      aksi: "UPDATE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek5}] ${updated.nm_rek5}`,
      dataSesudah: updated,
    });
    return updated;
  }
  const data = msRek6Schema.partial().parse(norm);
  const updated = await prisma.msRek6.update({ where: { id }, data });
  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: entitasName,
    entitasId: id,
    deskripsi: `Memperbarui ${entitasName} [${updated.kd_rek6}] ${updated.nm_rek6}`,
    dataSesudah: updated,
  });
  return updated;
}

export async function deleteMsRek(
  session: SessionPayload,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  id: string
) {
  const entitasName = `ms_rek${level}`;
  try {
    if (level === 1) await prisma.msRek1.delete({ where: { id } });
    else if (level === 2) await prisma.msRek2.delete({ where: { id } });
    else if (level === 3) await prisma.msRek3.delete({ where: { id } });
    else if (level === 4) await prisma.msRek4.delete({ where: { id } });
    else if (level === 5) await prisma.msRek5.delete({ where: { id } });
    else await prisma.msRek6.delete({ where: { id } });

    await recordAuditLog({
      session,
      aksi: "DELETE",
      modul: "master-data",
      entitas: entitasName,
      entitasId: id,
      deskripsi: `Menghapus data pada tabel ${entitasName} (ID: ${id})`,
    });
    return true;
  } catch {
    throw new Error(
      `Data ${entitasName} tidak dapat dihapus karena masih memiliki sub-level rekening atau transaksi terkait.`
    );
  }
}

// ==========================================
// 3. MASTER OPD (ms_opd) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listOpdPaginated(
  session: SessionPayload,
  params?: { search?: string; kd_urusan?: string; urusanKode?: string; page?: number; limit?: number }
) {
  const { page, limit, skip } = getPagination(params?.page, params?.limit);
  const opdFilter = getOpdFilter(session);
  const where: Prisma.OpdWhereInput = {};

  if (opdFilter) where.id = opdFilter;
  const urusanFilter = params?.kd_urusan || params?.urusanKode;
  if (urusanFilter) where.kd_urusan = urusanFilter;
  if (params?.search) {
    where.OR = [
      { kd_skpd: { contains: params.search, mode: "insensitive" } },
      { nm_skpd: { contains: params.search, mode: "insensitive" } },
      { singkatan: { contains: params.search, mode: "insensitive" } },
      { kepalaNama: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.opd.findMany({
      where,
      include: {
        _count: { select: { unitKerjas: true, users: true } },
      },
      orderBy: { kd_skpd: "asc" },
      skip,
      take: limit,
    }),
    prisma.opd.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function listOpd(session: SessionPayload, search?: string) {
  const res = await listOpdPaginated(session, { search, page: 1, limit: 100 });
  return res.items;
}

export async function createOpd(session: SessionPayload, input: z.infer<typeof opdSchema>) {
  const existing = await prisma.opd.findUnique({ where: { kd_skpd: input.kd_skpd } });
  if (existing)
    throw new Error(`Kode SKPD/OPD '${input.kd_skpd}' sudah digunakan oleh ${existing.nm_skpd}.`);

  const created = await prisma.opd.create({ data: input });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_opd",
    entitasId: created.id,
    deskripsi: `Menambahkan OPD [${created.kd_skpd}] ${created.nm_skpd}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateOpd(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof opdSchema>>
) {
  const existing = await prisma.opd.findUnique({ where: { id } });
  if (!existing) throw new Error("Perangkat Daerah (OPD) tidak ditemukan.");

  const updated = await prisma.opd.update({ where: { id }, data: input });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_opd",
    entitasId: updated.id,
    deskripsi: `Memperbarui OPD [${updated.kd_skpd}] ${updated.nm_skpd}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteOpd(session: SessionPayload, id: string) {
  const existing = await prisma.opd.findUnique({ where: { id } });
  if (!existing) throw new Error("OPD tidak ditemukan.");
  try {
    await prisma.opd.delete({ where: { id } });
    await recordAuditLog({
      session,
      aksi: "DELETE",
      modul: "master-data",
      entitas: "ms_opd",
      entitasId: id,
      deskripsi: `Menghapus OPD [${existing.kd_skpd}] ${existing.nm_skpd}`,
      dataSebelum: existing,
    });
    return true;
  } catch {
    throw new Error("OPD tidak dapat dihapus karena masih memiliki Unit Kerja atau Pengguna terkait.");
  }
}

// ==========================================
// 4. MASTER UNIT KERJA (ms_unit) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listUnitKerjaPaginated(
  session: SessionPayload,
  params?: { opdId?: string; search?: string; page?: number; limit?: number }
) {
  const { page, limit, skip } = getPagination(params?.page, params?.limit);
  const opdFilter = getOpdFilter(session, params?.opdId);
  const unitFilter = getUnitFilter(session);
  const where: Prisma.UnitKerjaWhereInput = {};

  if (opdFilter) where.opdId = opdFilter;
  if (unitFilter) where.id = unitFilter;
  if (params?.search) {
    where.OR = [
      { kd_unit: { contains: params.search, mode: "insensitive" } },
      { nm_unit: { contains: params.search, mode: "insensitive" } },
      { skpdbank: { contains: params.search, mode: "insensitive" } },
      { bank_penerima: { contains: params.search, mode: "insensitive" } },
      { rek_penerima: { contains: params.search, mode: "insensitive" } },
      { nama_penerima: { contains: params.search, mode: "insensitive" } },
      { kepalaNama: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.unitKerja.findMany({
      where,
      include: { opd: true },
      orderBy: { kd_unit: "asc" },
      skip,
      take: limit,
    }),
    prisma.unitKerja.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createUnitKerja(
  session: SessionPayload,
  input: z.infer<typeof unitKerjaSchema>
) {
  const existing = await prisma.unitKerja.findUnique({ where: { kd_unit: input.kd_unit } });
  if (existing) throw new Error(`Kode Unit Kerja '${input.kd_unit}' sudah terdaftar.`);

  const created = await prisma.unitKerja.create({
    data: input,
    include: { opd: true },
  });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_unit",
    entitasId: created.id,
    deskripsi: `Menambahkan Unit Kerja [${created.kd_unit}] ${created.nm_unit} pada ${created.opd.nm_skpd}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateUnitKerja(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof unitKerjaSchema>>
) {
  const existing = await prisma.unitKerja.findUnique({ where: { id } });
  if (!existing) throw new Error("Unit Kerja tidak ditemukan.");

  const updated = await prisma.unitKerja.update({
    where: { id },
    data: input,
    include: { opd: true },
  });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_unit",
    entitasId: updated.id,
    deskripsi: `Memperbarui Unit Kerja [${updated.kd_unit}] ${updated.nm_unit}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteUnitKerja(session: SessionPayload, id: string) {
  const existing = await prisma.unitKerja.findUnique({ where: { id } });
  if (!existing) throw new Error("Unit Kerja tidak ditemukan.");
  await prisma.unitKerja.delete({ where: { id } });
  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "master-data",
    entitas: "ms_unit",
    entitasId: id,
    deskripsi: `Menghapus Unit Kerja [${existing.kd_unit}] ${existing.nm_unit}`,
    dataSebelum: existing,
  });
  return true;
}

// ==========================================
// 5. MASTER PROGRAM (ms_program) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listProgramPaginated(params: {
  kd_urusan?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = getPagination(params.page, params.limit);
  const where: Prisma.ProgramWhereInput = {};
  if (params.kd_urusan) where.kd_urusan = params.kd_urusan;
  if (params.search) {
    where.OR = [
      { kd_program: { contains: params.search, mode: "insensitive" } },
      { nm_program: { contains: params.search, mode: "insensitive" } },
      { kd_urusan: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: {
        _count: { select: { kegiatans: true } },
      },
      orderBy: { kd_program: "asc" },
      skip,
      take: limit,
    }),
    prisma.program.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createProgram(session: SessionPayload, input: z.infer<typeof programSchema>) {
  const dup = await prisma.program.findUnique({
    where: { kd_program: input.kd_program },
  });
  if (dup) throw new Error(`Kode Program '${input.kd_program}' sudah terdaftar.`);

  const created = await prisma.program.create({
    data: {
      kd_program: input.kd_program,
      nm_program: input.nm_program,
      kd_urusan: input.kd_urusan || null,
      isActive: input.isActive,
    },
  });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_program",
    entitasId: created.id,
    deskripsi: `Menambahkan Program [${created.kd_program}] ${created.nm_program}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateProgram(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof programSchema>>
) {
  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing) throw new Error("Program tidak ditemukan.");

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...input,
      kd_urusan: input.kd_urusan === "" ? null : input.kd_urusan,
    },
  });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_program",
    entitasId: updated.id,
    deskripsi: `Memperbarui Program [${updated.kd_program}] ${updated.nm_program}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteProgram(session: SessionPayload, id: string) {
  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing) throw new Error("Program tidak ditemukan.");
  try {
    await prisma.program.delete({ where: { id } });
    await recordAuditLog({
      session,
      aksi: "DELETE",
      modul: "master-data",
      entitas: "ms_program",
      entitasId: id,
      deskripsi: `Menghapus Program [${existing.kd_program}] ${existing.nm_program}`,
      dataSebelum: existing,
    });
    return true;
  } catch {
    throw new Error("Program tidak dapat dihapus karena masih memiliki Kegiatan terkait.");
  }
}

// ==========================================
// 6. MASTER KEGIATAN (ms_kegiatan) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listKegiatanPaginated(params: {
  programId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = getPagination(params.page, params.limit);
  const where: Prisma.KegiatanWhereInput = {};
  if (params.programId) where.programId = params.programId;
  if (params.search) {
    where.OR = [
      { kd_kegiatan: { contains: params.search, mode: "insensitive" } },
      { nm_kegiatan: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.kegiatan.findMany({
      where,
      include: {
        program: true,
        _count: { select: { subkegiatans: true } },
      },
      orderBy: { kd_kegiatan: "asc" },
      skip,
      take: limit,
    }),
    prisma.kegiatan.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createKegiatan(
  session: SessionPayload,
  input: z.infer<typeof kegiatanSchema>
) {
  const program = await prisma.program.findUnique({ where: { id: input.programId } });
  if (!program) throw new Error("Program induk tidak ditemukan.");

  const dup = await prisma.kegiatan.findUnique({
    where: { kd_kegiatan: input.kd_kegiatan },
  });
  if (dup) throw new Error(`Kode Kegiatan '${input.kd_kegiatan}' sudah terdaftar.`);

  const created = await prisma.kegiatan.create({ data: input });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_kegiatan",
    entitasId: created.id,
    deskripsi: `Menambahkan Kegiatan [${created.kd_kegiatan}] ${created.nm_kegiatan}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateKegiatan(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof kegiatanSchema>>
) {
  const existing = await prisma.kegiatan.findUnique({ where: { id } });
  if (!existing) throw new Error("Kegiatan tidak ditemukan.");

  const updated = await prisma.kegiatan.update({ where: { id }, data: input });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_kegiatan",
    entitasId: updated.id,
    deskripsi: `Memperbarui Kegiatan [${updated.kd_kegiatan}] ${updated.nm_kegiatan}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteKegiatan(session: SessionPayload, id: string) {
  const existing = await prisma.kegiatan.findUnique({ where: { id } });
  if (!existing) throw new Error("Kegiatan tidak ditemukan.");
  try {
    await prisma.kegiatan.delete({ where: { id } });
    await recordAuditLog({
      session,
      aksi: "DELETE",
      modul: "master-data",
      entitas: "ms_kegiatan",
      entitasId: id,
      deskripsi: `Menghapus Kegiatan [${existing.kd_kegiatan}] ${existing.nm_kegiatan}`,
      dataSebelum: existing,
    });
    return true;
  } catch {
    throw new Error("Kegiatan tidak dapat dihapus karena masih memiliki Subkegiatan terkait.");
  }
}

// ==========================================
// 7. MASTER SUB KEGIATAN (ms_subkegiatan) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listSubkegiatanPaginated(params: {
  kegiatanId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = getPagination(params.page, params.limit);
  const where: Prisma.SubkegiatanWhereInput = {};
  if (params.kegiatanId) where.kegiatanId = params.kegiatanId;
  if (params.search) {
    where.OR = [
      { kd_sub_kegiatan: { contains: params.search, mode: "insensitive" } },
      { nm_sub_kegiatan: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.subkegiatan.findMany({
      where,
      include: {
        kegiatan: {
          include: { program: true },
        },
      },
      orderBy: { kd_sub_kegiatan: "asc" },
      skip,
      take: limit,
    }),
    prisma.subkegiatan.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createSubkegiatan(
  session: SessionPayload,
  input: z.infer<typeof subkegiatanSchema>
) {
  const kegiatan = await prisma.kegiatan.findUnique({ where: { id: input.kegiatanId } });
  if (!kegiatan) throw new Error("Kegiatan induk tidak ditemukan.");

  const dup = await prisma.subkegiatan.findUnique({
    where: { kd_sub_kegiatan: input.kd_sub_kegiatan },
  });
  if (dup) throw new Error(`Kode Subkegiatan '${input.kd_sub_kegiatan}' sudah terdaftar.`);

  const created = await prisma.subkegiatan.create({ data: input });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_subkegiatan",
    entitasId: created.id,
    deskripsi: `Menambahkan Subkegiatan [${created.kd_sub_kegiatan}] ${created.nm_sub_kegiatan}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateSubkegiatan(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof subkegiatanSchema>>
) {
  const existing = await prisma.subkegiatan.findUnique({ where: { id } });
  if (!existing) throw new Error("Subkegiatan tidak ditemukan.");

  const updated = await prisma.subkegiatan.update({ where: { id }, data: input });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_subkegiatan",
    entitasId: updated.id,
    deskripsi: `Memperbarui Subkegiatan [${updated.kd_sub_kegiatan}] ${updated.nm_sub_kegiatan}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteSubkegiatan(session: SessionPayload, id: string) {
  const existing = await prisma.subkegiatan.findUnique({ where: { id } });
  if (!existing) throw new Error("Subkegiatan tidak ditemukan.");
  await prisma.subkegiatan.delete({ where: { id } });
  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "master-data",
    entitas: "ms_subkegiatan",
    entitasId: id,
    deskripsi: `Menghapus Subkegiatan [${existing.kd_sub_kegiatan}] ${existing.nm_sub_kegiatan}`,
    dataSebelum: existing,
  });
  return true;
}

// ==========================================
// 8. MASTER SUMBER DANA (ms_sumber_dana) — CRUD + PAGINATION + FILTER
// ==========================================

export async function listSumberDanaPaginated(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = getPagination(params.page, params.limit);
  const where: Prisma.SumberDanaWhereInput = {};
  if (params.search) {
    where.OR = [
      { kd_sumdan: { contains: params.search, mode: "insensitive" } },
      { nm_sumdan: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.sumberDana.findMany({
      where,
      orderBy: { kd_sumdan: "asc" },
      skip,
      take: limit,
    }),
    prisma.sumberDana.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createSumberDana(
  session: SessionPayload,
  input: z.infer<typeof sumberDanaSchema>
) {
  const dup = await prisma.sumberDana.findUnique({
    where: { kd_sumdan: input.kd_sumdan },
  });
  if (dup) throw new Error(`Kode Sumber Dana '${input.kd_sumdan}' sudah terdaftar.`);

  const created = await prisma.sumberDana.create({ data: input });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "master-data",
    entitas: "ms_sumber_dana",
    entitasId: created.id,
    deskripsi: `Menambahkan Sumber Dana [${created.kd_sumdan}] ${created.nm_sumdan}`,
    dataSesudah: created,
  });

  return created;
}

export async function updateSumberDana(
  session: SessionPayload,
  id: string,
  input: Partial<z.infer<typeof sumberDanaSchema>>
) {
  const existing = await prisma.sumberDana.findUnique({ where: { id } });
  if (!existing) throw new Error("Sumber Dana tidak ditemukan.");

  const updated = await prisma.sumberDana.update({ where: { id }, data: input });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "master-data",
    entitas: "ms_sumber_dana",
    entitasId: updated.id,
    deskripsi: `Memperbarui Sumber Dana [${updated.kd_sumdan}] ${updated.nm_sumdan}`,
    dataSebelum: existing,
    dataSesudah: updated,
  });

  return updated;
}

export async function deleteSumberDana(session: SessionPayload, id: string) {
  const existing = await prisma.sumberDana.findUnique({ where: { id } });
  if (!existing) throw new Error("Sumber Dana tidak ditemukan.");
  await prisma.sumberDana.delete({ where: { id } });
  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "master-data",
    entitas: "ms_sumber_dana",
    entitasId: id,
    deskripsi: `Menghapus Sumber Dana [${existing.kd_sumdan}] ${existing.nm_sumdan}`,
    dataSebelum: existing,
  });
  return true;
}

// ==========================================
// 9. IMPORT BATCH MASTER DATA
// ==========================================

export interface ImportRowReport {
  baris: number;
  kode: string;
  uraian: string;
  status: "BERHASIL" | "GAGAL";
  alasan?: string;
}

export async function importMasterBatch(
  session: SessionPayload,
  params: {
    tahunAnggaranId?: string;
    targetEntitas: "REKENING" | "PROGRAM" | "SUMBER_DANA" | "OPD";
    rows: Record<string, unknown>[];
  }
) {
  const laporan: ImportRowReport[] = [];
  let berhasilCount = 0;
  let gagalCount = 0;

  for (let i = 0; i < params.rows.length; i++) {
    const raw = params.rows[i];
    const nomorBaris = i + 1;
    const kode = String(
      raw.kode ?? raw.kd_skpd ?? raw.kd_program ?? raw.kd_sumdan ?? ""
    ).trim();
    const uraian = String(
      raw.uraian ?? raw.nama ?? raw.nm_skpd ?? raw.nm_program ?? raw.nm_sumdan ?? ""
    ).trim();

    try {
      if (!kode || !uraian) {
        throw new Error("Kolom kode dan nama/uraian wajib diisi.");
      }

      if (params.targetEntitas === "SUMBER_DANA") {
        await createSumberDana(session, {
          kd_sumdan: kode,
          nm_sumdan: uraian,
          isActive: true,
        });
      } else if (params.targetEntitas === "PROGRAM") {
        await createProgram(session, {
          kd_program: kode,
          nm_program: uraian,
          kd_urusan: raw.kd_urusan ? String(raw.kd_urusan) : null,
          isActive: true,
        });
      } else if (params.targetEntitas === "OPD") {
        await createOpd(session, {
          kd_skpd: kode,
          nm_skpd: uraian,
          singkatan: raw.singkatan ? String(raw.singkatan) : null,
          kd_urusan: raw.kd_urusan ? String(raw.kd_urusan) : null,
          nm_urusan: raw.nm_urusan ? String(raw.nm_urusan) : null,
          kepalaNama: raw.kepalaNama ? String(raw.kepalaNama) : null,
          kepalaNip: raw.kepalaNip ? String(raw.kepalaNip) : null,
          isActive: true,
        });
      } else {
        throw new Error(`Gunakan menu spesifik untuk entitas '${params.targetEntitas}'.`);
      }

      berhasilCount++;
      laporan.push({ baris: nomorBaris, kode, uraian, status: "BERHASIL" });
    } catch (err: unknown) {
      gagalCount++;
      const message = err instanceof Error ? err.message : "Kesalahan validasi";
      laporan.push({
        baris: nomorBaris,
        kode: kode || "-",
        uraian: uraian || "-",
        status: "GAGAL",
        alasan: message,
      });
    }
  }

  return {
    targetEntitas: params.targetEntitas,
    totalBaris: params.rows.length,
    berhasilCount,
    gagalCount,
    laporan,
  };
}
