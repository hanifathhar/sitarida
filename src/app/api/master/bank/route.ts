import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";

const bankSchema = z.object({
  kode: z.string().trim().min(1, "Kode bank wajib diisi").max(50),
  nama: z.string().trim().min(1, "Nama bank wajib diisi").max(200),
  jns_rekening: z.enum(["BANK", "BILLER"], {
    message: "Jenis rekening harus BANK atau BILLER",
  }),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const search = searchParams.get("search")?.trim() || "";
    const jnsRekening = searchParams.get("jns_rekening")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = all ? 1000 : Math.max(1, Number(searchParams.get("limit") || "10"));

    const where: any = {};
    if (search) {
      where.OR = [
        { kode: { contains: search, mode: "insensitive" } },
        { nama: { contains: search, mode: "insensitive" } },
      ];
    }
    if (jnsRekening && jnsRekening !== "ALL") {
      where.jns_rekening = jnsRekening;
    }

    const [total, items] = await Promise.all([
      prisma.msBank.count({ where }),
      prisma.msBank.findMany({
        where,
        orderBy: [{ kode: "asc" }],
        skip: all ? 0 : (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (all) {
      return NextResponse.json({
        success: true,
        data: items,
        pagination: { total, page: 1, limit, totalPages: 1 },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      },
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("master:write");
    const body = await req.json();
    const input = bankSchema.parse(body);

    const existing = await prisma.msBank.findUnique({
      where: { kode: input.kode },
    });
    if (existing) {
      throw new Error(`Kode bank "${input.kode}" sudah terdaftar.`);
    }

    const created = await prisma.msBank.create({
      data: {
        kode: input.kode,
        nama: input.nama,
        jns_rekening: input.jns_rekening,
        isActive: input.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission("master:write");
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Bank wajib disertakan.");

    const input = bankSchema.partial().parse(rest);
    if (input.kode) {
      const dup = await prisma.msBank.findFirst({
        where: { kode: input.kode, NOT: { id } },
      });
      if (dup) {
        throw new Error(`Kode bank "${input.kode}" sudah digunakan.`);
      }
    }

    const updated = await prisma.msBank.update({
      where: { id },
      data: input,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission("master:write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID Bank wajib disertakan.");

    await prisma.msBank.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
