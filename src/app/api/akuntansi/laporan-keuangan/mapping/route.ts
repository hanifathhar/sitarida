import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  deleteMappingRow,
  getMappingRows,
  isSuperadminLaporan,
  resetMappingToDefault,
  saveMappingRow,
} from "@/modules/akuntansi/laporan-keuangan.service";
import type { JenisLaporanKeuangan } from "@/modules/akuntansi/laporan-keuangan.templates";

function parseJenis(raw: string | null): JenisLaporanKeuangan {
  const j = (raw || "LRA").toUpperCase();
  if (!["LRA", "LO", "NERACA"].includes(j)) {
    throw new Error("Jenis laporan tidak valid.");
  }
  return j as JenisLaporanKeuangan;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadminLaporan(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya Superadmin yang dapat mengakses mapping rekening." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jenis = parseJenis(searchParams.get("jenis"));
    const rows = await getMappingRows(session, jenis);
    return NextResponse.json({ success: true, data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadminLaporan(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya Superadmin yang dapat mengakses mapping rekening." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (body.action === "reset") {
      const jenis = parseJenis(body.jenisLaporan);
      const rows = await resetMappingToDefault(session, jenis);
      return NextResponse.json({ success: true, data: rows });
    }

    const jenis = parseJenis(body.jenisLaporan);
    const result = await saveMappingRow(session, {
      id: body.id || undefined,
      jenisLaporan: jenis,
      urutan: Number(body.urutan) || 10,
      kodeBaris: String(body.kodeBaris ?? ""),
      uraian: String(body.uraian ?? ""),
      tipeBaris: String(body.tipeBaris || "DETAIL"),
      level: Number(body.level) || 3,
      kodeRekening: body.kodeRekening ?? null,
      posisiNormal: body.posisiNormal || "AUTO",
      formula: body.formula ?? null,
      isBold: Boolean(body.isBold),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan mapping.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadminLaporan(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya Superadmin yang dapat mengakses mapping rekening." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const jenis = parseJenis(searchParams.get("jenis"));
    if (!id) {
      return NextResponse.json({ success: false, error: "ID baris wajib diisi." }, { status: 400 });
    }

    await deleteMappingRow(session, jenis, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus mapping.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
