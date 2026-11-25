import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import {
  getRestrictedSkpd,
  isAkuntansiAuthorized,
  JenisJurnal,
  SumberJurnalItem,
} from "./posting-jurnal.shared";
import { listSumberJurnalPenetapan } from "./posting-jurnal-penetapan.service";
import { listSumberJurnalPenerimaan } from "./posting-jurnal-penerimaan.service";
import { listSumberJurnalSp2d } from "./posting-jurnal-sp2d.service";
import { listSumberJurnalSpj } from "./posting-jurnal-spj.service";
import { listSumberJurnalSetorSisa } from "./posting-jurnal-setor-sisa.service";

export type { JenisJurnal, SumberJurnalItem } from "./posting-jurnal.shared";
export {
  isAkuntansiAuthorized,
  isCrossOpdAkuntansi,
  getAkuntansiScope,
} from "./posting-jurnal.shared";
export {
  postJurnalPenetapan,
  unpostJurnalPenetapan,
} from "./posting-jurnal-penetapan.service";
export {
  postJurnalPenerimaan,
  unpostJurnalPenerimaan,
} from "./posting-jurnal-penerimaan.service";
export {
  postJurnalSp2d,
  unpostJurnalSp2d,
} from "./posting-jurnal-sp2d.service";
export {
  postJurnalSpj,
  unpostJurnalSpj,
} from "./posting-jurnal-spj.service";
export {
  postJurnalSetorSisa,
  unpostJurnalSetorSisa,
} from "./posting-jurnal-setor-sisa.service";

export async function listSumberJurnal(
  session: SessionPayload,
  params: {
    jenis: JenisJurnal;
    tahunAnggaran: number;
    kd_skpd: string;
    kd_unit?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
) {
  const { jenis, tahunAnggaran, kd_skpd, kd_unit, startDate, endDate, search } = params;

  const restrictedSkpd = await getRestrictedSkpd(session);
  const targetSkpd = restrictedSkpd || kd_skpd;

  const filterParams = {
    tahunAnggaran,
    kd_skpd: targetSkpd,
    kd_unit,
    startDate,
    endDate,
  };

  let items: SumberJurnalItem[] = [];
  if (jenis === "penetapan") {
    items = await listSumberJurnalPenetapan(filterParams);
  } else if (jenis === "penerimaan") {
    items = await listSumberJurnalPenerimaan(filterParams);
  } else if (jenis === "sp2d") {
    items = await listSumberJurnalSp2d(filterParams);
  } else if (jenis === "spj") {
    items = await listSumberJurnalSpj(filterParams);
  } else if (jenis === "setor-sisa-kas") {
    items = await listSumberJurnalSetorSisa(filterParams);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.nomor.toLowerCase().includes(q) ||
        i.uraian.toLowerCase().includes(q) ||
        i.rekening.toLowerCase().includes(q) ||
        i.jenisLabel.toLowerCase().includes(q)
    );
  }

  const totalNilai = items.reduce((s, r) => s + r.nilai, 0);
  const totalSudahPosting = items.filter((r) => r.statusPosting === "SUDAH").length;
  const totalBelumPosting = items.length - totalSudahPosting;

  return {
    items,
    summary: {
      totalDokumen: items.length,
      totalBelumPosting,
      totalSudahPosting,
      totalNilai,
    },
  };
}

export async function getDetailJurnal(
  session: SessionPayload,
  params: {
    jenis: JenisJurnal;
    nomor: string;
  }
) {
  if (!isAkuntansiAuthorized(session, params.jenis)) {
    throw new Error("Akses ditolak untuk melihat detail jurnal.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  let noVoucher = params.nomor.trim();
  if (params.jenis === "penetapan") {
    noVoucher = `${params.nomor.trim()}/10`;
  } else if (params.jenis === "penerimaan") {
    noVoucher = `${params.nomor.trim()}/4`;
  } else if (params.jenis === "sp2d") {
    const sp2d = await prisma.trhsp2d.findFirst({
      where: {
        no_sp2d: params.nomor.trim(),
        ...(restrictedSkpd ? { kd_skpd: restrictedSkpd } : {}),
      },
      select: { no_terima: true, no_sp2d: true },
    });
    noVoucher = `${(sp2d?.no_terima || params.nomor).trim()}/2`;
  } else if (params.jenis === "spj" || params.jenis === "setor-sisa-kas") {
    noVoucher = `${params.nomor.trim()}/6`;
  }

  const noVouchersToFetch = [noVoucher];
  if (params.jenis === "penerimaan") {
    const penerimaan = await prisma.tblPenerimaan.findFirst({
      where: {
        no_terima: params.nomor.trim(),
        ...(restrictedSkpd ? { kd_skpd: restrictedSkpd } : {}),
      },
      select: { no_bukti_kasin: true, no_terima: true },
    });
    const stsNo = (penerimaan?.no_bukti_kasin || params.nomor).trim();
    noVouchersToFetch.push(`${stsNo}/5`);
  }

  const headers = await prisma.trhmaping.findMany({
    where: {
      no_voucher: { in: noVouchersToFetch },
      ...(restrictedSkpd ? { kd_skpd: restrictedSkpd } : {}),
    },
    include: {
      details: {
        orderBy: [{ rk: "asc" }, { kd_rek6: "asc" }],
      },
    },
    orderBy: { tabel: "asc" },
  });

  if (headers.length === 0) {
    return null;
  }

  const header = headers[0];
  const allDetails = headers.flatMap((h) => h.details);
  const totalDebet = headers.reduce((s, h) => s + (Number(h.total_debet) || 0), 0);
  const totalKredit = headers.reduce((s, h) => s + (Number(h.total_kredit) || 0), 0);

  return {
    id: header.id,
    no_voucher: headers.map((h) => h.no_voucher).join(" & "),
    tgl_voucher: header.tgl_voucher.toISOString().split("T")[0],
    kd_skpd: header.kd_skpd,
    nm_skpd: header.nm_skpd || header.kd_skpd,
    kd_unit: header.kd_unit || null,
    nm_unit: header.nm_unit || null,
    keterangan: header.keterangan || "-",
    total_debet: totalDebet,
    total_kredit: totalKredit,
    jns_transaksi: headers.map((h) => h.jns_transaksi || "-").join(" + "),
    tabel: headers.map((h) => h.tabel || "-").join(", "),
    details: allDetails.map((d) => ({
      id: d.id,
      kdsub_kegiatan: d.kdsub_kegiatan || "-",
      nm_sub_kegiatan: d.nm_sub_kegiatan || "-",
      kd_rek6: d.kd_rek6,
      nm_rek6: d.nm_rek6,
      rk: d.rk || "-",
      debet: Number(d.debet) || 0,
      kredit: Number(d.kredit) || 0,
      keterangan: d.keterangan || "-",
    })),
  };
}
