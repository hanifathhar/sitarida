import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isPengajuanAuthorized } from "@/modules/penatausahaan/pengajuan.service";

const penerimaSchema = z.object({
  nm_penerima: z.string().trim().min(1, "Nama penerima wajib diisi").max(255),
  bank_penerima: z.string().trim().min(1, "Bank penerima wajib dipilih").max(200),
  rek_penerima: z.string().trim().min(1, "Nomor rekening wajib diisi").max(100),
  npwp: z.string().trim().max(50).optional().nullable(),
  kd_skpd: z.string().trim().min(1, "Kode SKPD wajib diisi"),
  nm_skpd: z.string().trim().min(1, "Nama SKPD wajib diisi"),
  kd_unit: z.string().trim().optional().nullable(),
  nm_unit: z.string().trim().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "bank-options") {
      const banks = await prisma.msBank.findMany({
        where: { isActive: true },
        orderBy: [{ jns_rekening: "asc" }, { kode: "asc" }],
        select: {
          id: true,
          kode: true,
          nama: true,
          jns_rekening: true,
        },
      });
      return NextResponse.json({ success: true, data: banks });
    }

    const kd_skpd = searchParams.get("kd_skpd")?.trim() || "";
    const kd_unit = searchParams.get("kd_unit")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";

    const andConditions: any[] = [{ isActive: true }];
    if (kd_skpd) {
      andConditions.push({ kd_skpd });
    }
    if (kd_unit && kd_unit !== "ALL") {
      andConditions.push({
        OR: [{ kd_unit }, { kd_unit: null }, { kd_unit: "" }],
      });
    }
    if (q) {
      andConditions.push({
        OR: [
          { nm_penerima: { contains: q, mode: "insensitive" } },
          { bank_penerima: { contains: q, mode: "insensitive" } },
          { rek_penerima: { contains: q, mode: "insensitive" } },
          { npwp: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const data = await prisma.msPenerima.findMany({
      where: { AND: andConditions },
      orderBy: [{ nm_penerima: "asc" }],
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/pengajuan/penerima error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data penerima" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const input = penerimaSchema.parse(body);

    const created = await prisma.msPenerima.create({
      data: {
        nm_penerima: input.nm_penerima,
        bank_penerima: input.bank_penerima,
        rek_penerima: input.rek_penerima,
        npwp: input.npwp || null,
        kd_skpd: input.kd_skpd,
        nm_skpd: input.nm_skpd,
        kd_unit: input.kd_unit || null,
        nm_unit: input.nm_unit || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/pengajuan/penerima error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan data penerima" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID penerima wajib disertakan" },
        { status: 400 }
      );
    }

    const input = penerimaSchema.partial().parse(rest);
    const updated = await prisma.msPenerima.update({
      where: { id },
      data: {
        ...(input.nm_penerima !== undefined ? { nm_penerima: input.nm_penerima } : {}),
        ...(input.bank_penerima !== undefined ? { bank_penerima: input.bank_penerima } : {}),
        ...(input.rek_penerima !== undefined ? { rek_penerima: input.rek_penerima } : {}),
        ...(input.npwp !== undefined ? { npwp: input.npwp || null } : {}),
        ...(input.kd_skpd !== undefined ? { kd_skpd: input.kd_skpd } : {}),
        ...(input.nm_skpd !== undefined ? { nm_skpd: input.nm_skpd } : {}),
        ...(input.kd_unit !== undefined ? { kd_unit: input.kd_unit || null } : {}),
        ...(input.nm_unit !== undefined ? { nm_unit: input.nm_unit || null } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/pengajuan/penerima error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui data penerima" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID penerima wajib disertakan" },
        { status: 400 }
      );
    }

    await prisma.msPenerima.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/pengajuan/penerima error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus data penerima" },
      { status: 400 }
    );
  }
}
