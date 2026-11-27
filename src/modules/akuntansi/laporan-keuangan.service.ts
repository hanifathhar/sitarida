import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { getRestrictedSkpd, isCrossOpdAkuntansi } from "./posting-jurnal.shared";
import {
  getDefaultTemplate,
  type JenisLaporanKeuangan,
  type MappingTemplateRow,
} from "./laporan-keuangan.templates";

export function isSuperadminLaporan(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  return roleKode === "0" || roleKode === "SUPERADMIN";
}

export function isLaporanKeuanganAuthorized(session: SessionPayload): boolean {
  if (isSuperadminLaporan(session)) return true;

  const perms = session.permissions || [];
  return (
    perms.includes("akuntansi:read") ||
    perms.includes("akuntansi:post") ||
    perms.includes("menu:akuntansi:laporan-lra") ||
    perms.includes("menu:akuntansi:laporan-lo") ||
    perms.includes("menu:akuntansi:laporan-neraca")
  );
}

export interface MapLaporanRow {
  id: string;
  jenisLaporan: JenisLaporanKeuangan;
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

export async function getLaporanKeuanganRefs(session: SessionPayload) {
  if (!isLaporanKeuanganAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Laporan Keuangan.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const opdWhere: any = { isActive: true };
  if (!isCrossOpd && session.opdId) {
    opdWhere.id = session.opdId;
  }

  const [opds, units, rek1, rek2, rek3, rek4, rek5, rek6] = await Promise.all([
    prisma.opd.findMany({
      where: opdWhere,
      select: { id: true, kd_skpd: true, nm_skpd: true },
      orderBy: { kd_skpd: "asc" },
    }),
    prisma.unitKerja.findMany({
      where: {
        isActive: true,
        ...(!isCrossOpd && session.opdId ? { opdId: session.opdId } : {}),
      },
      select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      orderBy: { kd_unit: "asc" },
    }),
    prisma.msRek1.findMany({
      where: { isActive: true },
      select: { kd_rek1: true, nm_rek1: true },
      orderBy: { kd_rek1: "asc" },
    }),
    prisma.msRek2.findMany({
      where: { isActive: true },
      select: { kd_rek2: true, nm_rek2: true },
      orderBy: { kd_rek2: "asc" },
    }),
    prisma.msRek3.findMany({
      where: { isActive: true },
      select: { kd_rek3: true, nm_rek3: true },
      orderBy: { kd_rek3: "asc" },
    }),
    prisma.msRek4.findMany({
      where: { isActive: true },
      select: { kd_rek4: true, nm_rek4: true },
      orderBy: { kd_rek4: "asc" },
    }),
    prisma.msRek5.findMany({
      where: { isActive: true },
      select: { kd_rek5: true, nm_rek5: true },
      orderBy: { kd_rek5: "asc" },
    }),
    prisma.msRek6.findMany({
      where: { isActive: true },
      select: { kd_rek6: true, nm_rek6: true },
      orderBy: { kd_rek6: "asc" },
    }),
  ]);

  return {
    isSuperadmin: isSuperadminLaporan(session),
    isCrossOpd,
    tahunAnggaran: session.tahunAnggaran || 2026,
    opds,
    units,
    rekByLevel: {
      "1": rek1.map((r) => ({ kode: r.kd_rek1, nama: r.nm_rek1 })),
      "2": rek2.map((r) => ({ kode: r.kd_rek2, nama: r.nm_rek2 })),
      "3": rek3.map((r) => ({ kode: r.kd_rek3, nama: r.nm_rek3 })),
      "4": rek4.map((r) => ({ kode: r.kd_rek4, nama: r.nm_rek4 })),
      "5": rek5.map((r) => ({ kode: r.kd_rek5, nama: r.nm_rek5 })),
      "6": rek6.map((r) => ({ kode: r.kd_rek6, nama: r.nm_rek6 })),
    },
  };
}

function getMappingTableName(jenis: JenisLaporanKeuangan): string {
  if (jenis === "LRA") return "map_laporan_lra";
  if (jenis === "LO") return "map_laporan_lo";
  return "map_laporan_neraca";
}

async function insertTemplateRows(jenis: JenisLaporanKeuangan, rows: MappingTemplateRow[]) {
  const table = getMappingTableName(jenis);
  for (const r of rows) {
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${table}
       (id, urutan, "kodeBaris", uraian, "tipeBaris", level, "kodeRekening", "posisiNormal", formula, "isBold", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      id,
      r.urutan,
      r.kodeBaris,
      r.uraian,
      r.tipeBaris,
      r.level,
      r.kodeRekening,
      r.posisiNormal,
      r.formula,
      r.isBold
    );
  }
}

export async function ensureDefaultMapping(jenis: JenisLaporanKeuangan): Promise<MapLaporanRow[]> {
  const table = getMappingTableName(jenis);
  const existing = await prisma.$queryRawUnsafe<Omit<MapLaporanRow, "jenisLaporan">[]>(
    `SELECT id, urutan, "kodeBaris", uraian, "tipeBaris", level, "kodeRekening", "posisiNormal", formula, "isBold"
     FROM ${table}
     ORDER BY urutan ASC, "kodeBaris" ASC`
  );

  if (existing.length > 0) {
    return existing.map((r) => ({ ...r, jenisLaporan: jenis }));
  }

  const template = getDefaultTemplate(jenis);
  await insertTemplateRows(jenis, template);

  const seeded = await prisma.$queryRawUnsafe<Omit<MapLaporanRow, "jenisLaporan">[]>(
    `SELECT id, urutan, "kodeBaris", uraian, "tipeBaris", level, "kodeRekening", "posisiNormal", formula, "isBold"
     FROM ${table}
     ORDER BY urutan ASC, "kodeBaris" ASC`
  );
  return seeded.map((r) => ({ ...r, jenisLaporan: jenis }));
}

export async function getMappingRows(session: SessionPayload, jenis: JenisLaporanKeuangan) {
  if (!isSuperadminLaporan(session)) {
    throw new Error("Akses ditolak. Pengaturan mapping rekening hanya untuk Superadmin.");
  }
  return ensureDefaultMapping(jenis);
}

export async function saveMappingRow(
  session: SessionPayload,
  input: {
    id?: string;
    jenisLaporan: JenisLaporanKeuangan;
    urutan: number;
    kodeBaris: string;
    uraian: string;
    tipeBaris: string;
    level: number;
    kodeRekening?: string | null;
    posisiNormal?: string;
    formula?: string | null;
    isBold?: boolean;
  }
) {
  if (!isSuperadminLaporan(session)) {
    throw new Error("Akses ditolak. Pengaturan mapping rekening hanya untuk Superadmin.");
  }

  const table = getMappingTableName(input.jenisLaporan);
  const kodeRek = input.kodeRekening?.trim() ? input.kodeRekening.trim() : null;
  const formula = input.formula?.trim() ? input.formula.trim() : null;
  const posisi = input.posisiNormal || "AUTO";
  const isBold = Boolean(input.isBold);

  if (input.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE ${table}
       SET urutan = $1, "kodeBaris" = $2, uraian = $3, "tipeBaris" = $4, level = $5,
           "kodeRekening" = $6, "posisiNormal" = $7, formula = $8, "isBold" = $9, "updatedAt" = NOW()
       WHERE id = $10`,
      Number(input.urutan) || 0,
      input.kodeBaris.trim(),
      input.uraian.trim(),
      input.tipeBaris,
      Number(input.level) || 1,
      kodeRek,
      posisi,
      formula,
      isBold,
      input.id
    );
    return { id: input.id };
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${table}
     (id, urutan, "kodeBaris", uraian, "tipeBaris", level, "kodeRekening", "posisiNormal", formula, "isBold", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
    id,
    Number(input.urutan) || 0,
    input.kodeBaris.trim(),
    input.uraian.trim(),
    input.tipeBaris,
    Number(input.level) || 1,
    kodeRek,
    posisi,
    formula,
    isBold
  );
  return { id };
}

export async function deleteMappingRow(
  session: SessionPayload,
  jenis: JenisLaporanKeuangan,
  id: string
) {
  if (!isSuperadminLaporan(session)) {
    throw new Error("Akses ditolak. Pengaturan mapping rekening hanya untuk Superadmin.");
  }
  const table = getMappingTableName(jenis);
  await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id = $1`, id);
}

export async function resetMappingToDefault(session: SessionPayload, jenis: JenisLaporanKeuangan) {
  if (!isSuperadminLaporan(session)) {
    throw new Error("Akses ditolak. Pengaturan mapping rekening hanya untuk Superadmin.");
  }
  const table = getMappingTableName(jenis);
  await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  await insertTemplateRows(jenis, getDefaultTemplate(jenis));
  return ensureDefaultMapping(jenis);
}

function matchPrefix(kdRek6: string, prefix: string): boolean {
  const p = prefix.trim();
  if (!p) return false;
  return kdRek6 === p || kdRek6.startsWith(p + ".");
}

function applyPosisi(
  debet: number,
  kredit: number,
  posisi: string,
  kdRekSample?: string
): number {
  if (posisi === "DEBET") return debet - kredit;
  if (posisi === "KREDIT") return kredit - debet;
  if (posisi === "MINUS_DEBET") return -(debet - kredit);
  if (posisi === "MINUS_KREDIT") return -(kredit - debet);

  const ref = kdRekSample || "";
  if (
    ref.startsWith("1") ||
    ref.startsWith("5") ||
    ref.startsWith("6.2") ||
    ref.startsWith("8")
  ) {
    return debet - kredit;
  }
  return kredit - debet;
}

function evaluateFormula(
  formula: string | null,
  valueMap: Map<string, number>
): number {
  if (!formula || !formula.trim()) return 0;
  const expr = formula.replace(/\s+/g, "");
  // Parse tokens separated by + or -
  let total = 0;
  let currentSign = 1;
  let token = "";

  const flush = () => {
    if (!token) return;
    const val = valueMap.get(token) ?? 0;
    total += currentSign * val;
    token = "";
  };

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "+" || ch === "-") {
      flush();
      currentSign = ch === "+" ? 1 : -1;
    } else {
      token += ch;
    }
  }
  flush();
  return total;
}

export interface LaporanKeuanganComputedRow {
  id: string;
  urutan: number;
  kodeBaris: string;
  uraian: string;
  tipeBaris: string;
  level: number;
  kodeRekening: string | null;
  posisiNormal: string;
  formula: string | null;
  isBold: boolean;
  col1: number; // LRA: Anggaran Tahun Ini | LO: Tahun Ini | NERACA: Tahun Ini
  col2: number; // LRA: Realisasi Tahun Ini | LO: Tahun Lalu | NERACA: Tahun Lalu
  col3: number; // LRA: (%) | LO: Kenaikan/(Penurunan) | NERACA: 0
  col4: number; // LRA: Realisasi Tahun Lalu | LO: (%) | NERACA: 0
}

export async function getLaporanKeuanganData(
  session: SessionPayload,
  params: {
    jenis: JenisLaporanKeuangan;
    tahunAnggaran: number;
    allKabupaten?: boolean;
    kd_skpd?: string;
    kd_unit?: string;
    kd_rek?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  if (!isLaporanKeuanganAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Laporan Keuangan.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const restrictedSkpd = await getRestrictedSkpd(session);

  let scopeSkpd: string | null = null;
  let scopeUnit: string | null = null;

  if (restrictedSkpd) {
    scopeSkpd = restrictedSkpd;
    if (params.kd_unit?.trim()) scopeUnit = params.kd_unit.trim();
  } else if (!(params.allKabupaten && isCrossOpd)) {
    if (!params.kd_skpd) {
      throw new Error("OPD wajib dipilih atau centang Tampilan Seluruh Kabupaten.");
    }
    scopeSkpd = params.kd_skpd;
    if (params.kd_unit?.trim()) scopeUnit = params.kd_unit.trim();
  }

  const mappingRows = await ensureDefaultMapping(params.jenis);
  const tahunIni = params.tahunAnggaran;
  const tahunLalu = tahunIni - 1;
  const rekFilter = params.kd_rek?.trim() || null;

  // Helper to build where for trdmaping
  const buildMapingWhere = (tahun: number, useDateFilter: boolean) => {
    const w: any = {
      tahunAnggaran: tahun,
      header: { isNot: null },
    };
    if (scopeSkpd) w.kd_skpd = scopeSkpd;
    if (scopeUnit) w.kd_unit = scopeUnit;
    if (rekFilter) {
      w.OR = [
        { kd_rek6: rekFilter },
        { kd_rek6: { startsWith: `${rekFilter}.` } },
      ];
    }
    if (useDateFilter && (params.startDate || params.endDate)) {
      w.tgl_voucher = {};
      if (params.startDate) {
        w.tgl_voucher.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      }
      if (params.endDate) {
        w.tgl_voucher.lte = new Date(`${params.endDate}T23:59:59.999Z`);
      }
    }
    return w;
  };

  if (params.jenis === "LRA") {
    const trdrkaWhere: any = { tahunAnggaran: tahunIni };
    if (scopeSkpd) trdrkaWhere.kd_skpd = scopeSkpd;
    if (scopeUnit) trdrkaWhere.kd_unit = scopeUnit;
    if (rekFilter) {
      trdrkaWhere.OR = [
        { kd_rek6: rekFilter },
        { kd_rek6: { startsWith: `${rekFilter}.` } },
      ];
    }

    const [anggaranRows, realIniRows, realLaluRows] = await Promise.all([
      prisma.trdrka.findMany({
        where: trdrkaWhere,
        select: { kd_rek6: true, nilai_ubah: true },
      }),
      prisma.trdmaping.groupBy({
        by: ["kd_rek6"],
        where: buildMapingWhere(tahunIni, true),
        _sum: { debet: true, kredit: true },
      }),
      prisma.trdmaping.groupBy({
        by: ["kd_rek6"],
        where: buildMapingWhere(tahunLalu, false),
        _sum: { debet: true, kredit: true },
      }),
    ]);

    const angMap = new Map<string, number>();
    for (const r of anggaranRows) {
      const val = Number(r.nilai_ubah || 0);
      angMap.set(r.kd_rek6, (angMap.get(r.kd_rek6) || 0) + val);
    }

    const realIniMap = new Map<string, { d: number; k: number }>();
    for (const r of realIniRows) {
      realIniMap.set(r.kd_rek6, {
        d: Number(r._sum.debet || 0),
        k: Number(r._sum.kredit || 0),
      });
    }

    const realLaluMap = new Map<string, { d: number; k: number }>();
    for (const r of realLaluRows) {
      realLaluMap.set(r.kd_rek6, {
        d: Number(r._sum.debet || 0),
        k: Number(r._sum.kredit || 0),
      });
    }

    const col1ByCode = new Map<string, number>();
    const col2ByCode = new Map<string, number>();
    const col4ByCode = new Map<string, number>();

    const computed: LaporanKeuanganComputedRow[] = mappingRows.map((m) => {
      let c1 = 0;
      let c2 = 0;
      let c4 = 0;

      if (m.kodeRekening) {
        const prefixes = m.kodeRekening.split(",").map((s) => s.trim()).filter(Boolean);
        for (const [kd, v] of angMap.entries()) {
          if (prefixes.some((p) => matchPrefix(kd, p))) c1 += v;
        }
        for (const [kd, v] of realIniMap.entries()) {
          if (prefixes.some((p) => matchPrefix(kd, p))) {
            c2 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
          }
        }
        for (const [kd, v] of realLaluMap.entries()) {
          if (prefixes.some((p) => matchPrefix(kd, p))) {
            c4 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
          }
        }
      }

      if (m.kodeBaris) {
        col1ByCode.set(m.kodeBaris, c1);
        col2ByCode.set(m.kodeBaris, c2);
        col4ByCode.set(m.kodeBaris, c4);
      }

      return {
        ...m,
        col1: c1,
        col2: c2,
        col3: 0,
        col4: c4,
      };
    });

    // Multi-pass formula evaluation (bottom-up / hierarchical)
    for (let pass = 0; pass < 4; pass++) {
      for (const row of computed) {
        if (row.formula) {
          row.col1 = evaluateFormula(row.formula, col1ByCode);
          row.col2 = evaluateFormula(row.formula, col2ByCode);
          row.col4 = evaluateFormula(row.formula, col4ByCode);
          if (row.kodeBaris) {
            col1ByCode.set(row.kodeBaris, row.col1);
            col2ByCode.set(row.kodeBaris, row.col2);
            col4ByCode.set(row.kodeBaris, row.col4);
          }
        }
      }
    }

    for (const row of computed) {
      row.col3 =
        row.col1 !== 0
          ? (row.col2 / row.col1) * 100
          : row.col2 !== 0
            ? 100
            : 0;
    }

    return { tahunIni, tahunLalu, rows: computed };
  }

  if (params.jenis === "LO") {
    const [realIniRows, realLaluRows] = await Promise.all([
      prisma.trdmaping.groupBy({
        by: ["kd_rek6"],
        where: buildMapingWhere(tahunIni, true),
        _sum: { debet: true, kredit: true },
      }),
      prisma.trdmaping.groupBy({
        by: ["kd_rek6"],
        where: buildMapingWhere(tahunLalu, false),
        _sum: { debet: true, kredit: true },
      }),
    ]);

    const realIniMap = new Map<string, { d: number; k: number }>();
    for (const r of realIniRows) {
      realIniMap.set(r.kd_rek6, {
        d: Number(r._sum.debet || 0),
        k: Number(r._sum.kredit || 0),
      });
    }

    const realLaluMap = new Map<string, { d: number; k: number }>();
    for (const r of realLaluRows) {
      realLaluMap.set(r.kd_rek6, {
        d: Number(r._sum.debet || 0),
        k: Number(r._sum.kredit || 0),
      });
    }

    const col1ByCode = new Map<string, number>();
    const col2ByCode = new Map<string, number>();

    const computed: LaporanKeuanganComputedRow[] = mappingRows.map((m) => {
      let c1 = 0;
      let c2 = 0;

      if (m.kodeRekening) {
        const prefixes = m.kodeRekening.split(",").map((s) => s.trim()).filter(Boolean);
        for (const [kd, v] of realIniMap.entries()) {
          if (prefixes.some((p) => matchPrefix(kd, p))) {
            c1 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
          }
        }
        for (const [kd, v] of realLaluMap.entries()) {
          if (prefixes.some((p) => matchPrefix(kd, p))) {
            c2 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
          }
        }
      }

      if (m.kodeBaris) {
        col1ByCode.set(m.kodeBaris, c1);
        col2ByCode.set(m.kodeBaris, c2);
      }

      return { ...m, col1: c1, col2: c2, col3: 0, col4: 0 };
    });

    for (let pass = 0; pass < 4; pass++) {
      for (const row of computed) {
        if (row.formula) {
          row.col1 = evaluateFormula(row.formula, col1ByCode);
          row.col2 = evaluateFormula(row.formula, col2ByCode);
          if (row.kodeBaris) {
            col1ByCode.set(row.kodeBaris, row.col1);
            col2ByCode.set(row.kodeBaris, row.col2);
          }
        }
      }
    }

    for (const row of computed) {
      row.col3 = row.col1 - row.col2;
      row.col4 =
        row.col2 !== 0
          ? (row.col3 / Math.abs(row.col2)) * 100
          : row.col3 !== 0
            ? 100
            : 0;
    }

    return { tahunIni, tahunLalu, rows: computed };
  }

  // NERACA
  const saldoConditions: string[] = [`"tahunAnggaran" = $1`];
  const saldoParams: any[] = [tahunIni];
  let idx = 2;
  if (scopeSkpd) {
    saldoConditions.push(`kd_skpd = $${idx++}`);
    saldoParams.push(scopeSkpd);
  }
  if (scopeUnit) {
    saldoConditions.push(`kd_unit = $${idx++}`);
    saldoParams.push(scopeUnit);
  }
  if (rekFilter) {
    saldoConditions.push(`(kd_rek6 = $${idx} OR kd_rek6 LIKE $${idx + 1})`);
    saldoParams.push(rekFilter, `${rekFilter}.%`);
    idx += 2;
  }

  const [saldoAwalRows, mutasiIniRows, mutasiLaluRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ kd_rek6: string; rk: string; total_nilai: unknown }>>(
      `SELECT kd_rek6, rk::text AS rk, COALESCE(SUM(nilai), 0) AS total_nilai
       FROM saldo_awal_akun
       WHERE ${saldoConditions.join(" AND ")}
       GROUP BY kd_rek6, rk`,
      ...saldoParams
    ),
    prisma.trdmaping.groupBy({
      by: ["kd_rek6"],
      where: buildMapingWhere(tahunIni, true),
      _sum: { debet: true, kredit: true },
    }),
    prisma.trdmaping.groupBy({
      by: ["kd_rek6"],
      where: buildMapingWhere(tahunLalu, false),
      _sum: { debet: true, kredit: true },
    }),
  ]);

  const saMap = new Map<string, { d: number; k: number }>();
  for (const r of saldoAwalRows) {
    const prev = saMap.get(r.kd_rek6) || { d: 0, k: 0 };
    const val = Number(r.total_nilai || 0);
    if (r.rk === "K") prev.k += val;
    else prev.d += val;
    saMap.set(r.kd_rek6, prev);
  }

  const mutIniMap = new Map<string, { d: number; k: number }>();
  for (const r of mutasiIniRows) {
    mutIniMap.set(r.kd_rek6, {
      d: Number(r._sum.debet || 0),
      k: Number(r._sum.kredit || 0),
    });
  }

  const mutLaluMap = new Map<string, { d: number; k: number }>();
  for (const r of mutasiLaluRows) {
    mutLaluMap.set(r.kd_rek6, {
      d: Number(r._sum.debet || 0),
      k: Number(r._sum.kredit || 0),
    });
  }

  // Combine Saldo Awal + Mutasi Tahun Ini for Tahun Ini;
  // Tahun Lalu = Saldo Awal Tahun Ini (if any) or Mutasi Tahun Lalu
  const allRekKeys = new Set<string>([
    ...saMap.keys(),
    ...mutIniMap.keys(),
    ...mutLaluMap.keys(),
  ]);

  const neracaIniMap = new Map<string, { d: number; k: number }>();
  const neracaLaluMap = new Map<string, { d: number; k: number }>();

  for (const kd of allRekKeys) {
    const sa = saMap.get(kd) || { d: 0, k: 0 };
    const mIni = mutIniMap.get(kd) || { d: 0, k: 0 };
    const mLalu = mutLaluMap.get(kd) || { d: 0, k: 0 };
    neracaIniMap.set(kd, { d: sa.d + mIni.d, k: sa.k + mIni.k });
    neracaLaluMap.set(kd, sa.d > 0 || sa.k > 0 ? sa : mLalu);
  }

  const col1ByCode = new Map<string, number>();
  const col2ByCode = new Map<string, number>();

  const computed: LaporanKeuanganComputedRow[] = mappingRows.map((m) => {
    let c1 = 0;
    let c2 = 0;

    if (m.kodeRekening) {
      const prefixes = m.kodeRekening.split(",").map((s) => s.trim()).filter(Boolean);
      for (const [kd, v] of neracaIniMap.entries()) {
        if (prefixes.some((p) => matchPrefix(kd, p))) {
          c1 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
        }
      }
      for (const [kd, v] of neracaLaluMap.entries()) {
        if (prefixes.some((p) => matchPrefix(kd, p))) {
          c2 += applyPosisi(v.d, v.k, m.posisiNormal, kd);
        }
      }
    }

    if (m.kodeBaris) {
      col1ByCode.set(m.kodeBaris, c1);
      col2ByCode.set(m.kodeBaris, c2);
    }

    return { ...m, col1: c1, col2: c2, col3: 0, col4: 0 };
  });

  for (let pass = 0; pass < 4; pass++) {
    for (const row of computed) {
      if (row.formula) {
        row.col1 = evaluateFormula(row.formula, col1ByCode);
        row.col2 = evaluateFormula(row.formula, col2ByCode);
        if (row.kodeBaris) {
          col1ByCode.set(row.kodeBaris, row.col1);
          col2ByCode.set(row.kodeBaris, row.col2);
        }
      }
    }
  }

  return { tahunIni, tahunLalu, rows: computed };
}
