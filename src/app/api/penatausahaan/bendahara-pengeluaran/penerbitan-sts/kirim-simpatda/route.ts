import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isBendaharaAuthorized } from "@/modules/penatausahaan/bendahara-pengeluaran.service";
import {
  getSimpatdaConnection,
  syncStsFromSimpatda,
} from "@/lib/simpatda-sts";

function formatDateYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | null = null;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isBendaharaAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses ditolak. Modul Bendahara Pengeluaran hanya dapat diakses oleh BUD, Bendahara Pengeluaran, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Penerbitan STS wajib disertakan." },
        { status: 400 }
      );
    }

    const stsRecord = await prisma.tblPengembalian.findUnique({
      where: { id },
    });
    if (!stsRecord) {
      return NextResponse.json(
        { success: false, error: "Data Penerbitan STS tidak ditemukan." },
        { status: 404 }
      );
    }

    if (stsRecord.verif === 1) {
      return NextResponse.json(
        {
          success: false,
          error: "STS sudah terbayar (verif = 1). Fitur kirim data dikunci.",
        },
        { status: 400 }
      );
    }

    const noSts = (stsRecord.no_sts || stsRecord.no_tetap || "").trim();
    if (!noSts) {
      return NextResponse.json(
        { success: false, error: "Nomor STS tidak valid atau kosong." },
        { status: 400 }
      );
    }

    let skpdMap = "";
    if (stsRecord.kd_unit) {
      const unit = await prisma.unitKerja.findUnique({
        where: { kd_unit: stsRecord.kd_unit },
        select: { skpdmap: true },
      });
      skpdMap = (unit?.skpdmap || "").trim();
    }

    const tglTetapDate = new Date(stsRecord.tgl_tetap);
    const tglTetapStr = formatDateYmd(tglTetapDate);
    const tmtAkhirDate = new Date(tglTetapDate);
    tmtAkhirDate.setDate(tmtAkhirDate.getDate() + 30);
    const tmtAkhirStr = formatDateYmd(tmtAkhirDate);

    const kdRek5Clean = (stsRecord.kd_rek6 || "").replace(/\./g, "").trim();
    const nmRek5 = (stsRecord.nm_rek6 || "").trim();
    const nilaiPokok = Number(stsRecord.nilai) || 0;
    const keterangan = (stsRecord.uraian || "").trim();
    const company = (
      stsRecord.nama_penyetor ||
      stsRecord.nm_unit ||
      ""
    ).trim();
    const alamat = (stsRecord.alamat_penyetor || "").trim();
    const kdKegiatan = (stsRecord.kd_sub_kegiatan || "").trim();
    const npwp = "";
    const tahun = stsRecord.tahunAnggaran || tglTetapDate.getFullYear();
    const jenis = 1;

    conn = await getSimpatdaConnection();

    // Cek apakah no_sts sudah pernah dikirim ke tr_tetap
    const [existingRows] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT no_sts FROM tr_tetap WHERE no_sts = ? LIMIT 1",
      [noSts]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      await prisma.tblPengembalian.update({
        where: { id },
        data: { sent_simpatda: true },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Data STS dengan nomor ${noSts} sudah ada di database dbsimpatda (tr_tetap). Status disinkronkan menjadi Terkirim.`,
        },
        { status: 409 }
      );
    }

    await conn.execute(
      `INSERT INTO tr_tetap (
        no_tetap, tgl_tetap, no_sts, kd_skpd, kd_kegiatan,
        kd_rek5, nm_rek5, nilai, denda, keterangan,
        company, alamat, npwp, tmt_akhir, tahun, jenis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noSts,
        tglTetapStr,
        noSts,
        skpdMap,
        kdKegiatan,
        kdRek5Clean,
        nmRek5,
        nilaiPokok,
        keterangan,
        company,
        alamat,
        npwp,
        tmtAkhirStr,
        tahun,
        jenis,
      ]
    );

    await prisma.tblPengembalian.update({
      where: { id },
      data: { sent_simpatda: true },
    });

    return NextResponse.json({
      success: true,
      message: `Data STS ${noSts} berhasil dikirim ke database dbsimpatda (tr_tetap).`,
      data: {
        no_sts: noSts,
        kd_skpd: skpdMap,
        kd_kegiatan: kdKegiatan,
        kd_rek5: kdRek5Clean,
        nilai: nilaiPokok,
        tgl_tetap: tglTetapStr,
        tmt_akhir: tmtAkhirStr,
      },
    });
  } catch (err: any) {
    console.error(
      "POST /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts/kirim-simpatda error:",
      err
    );
    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          "Gagal mengirim data STS ke database dbsimpatda.",
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
}

export async function DELETE(req: NextRequest) {
  let conn: mysql.Connection | null = null;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isBendaharaAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses ditolak. Modul Bendahara Pengeluaran hanya dapat diakses oleh BUD, Bendahara Pengeluaran, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Penerbitan STS wajib disertakan." },
        { status: 400 }
      );
    }

    const stsRecord = await prisma.tblPengembalian.findUnique({
      where: { id },
    });
    if (!stsRecord) {
      return NextResponse.json(
        { success: false, error: "Data Penerbitan STS tidak ditemukan." },
        { status: 404 }
      );
    }

    if (stsRecord.verif === 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "STS sudah terbayar (verif = 1). Fitur batal kirim dikunci.",
        },
        { status: 400 }
      );
    }

    const noSts = (stsRecord.no_sts || stsRecord.no_tetap || "").trim();
    if (!noSts) {
      return NextResponse.json(
        { success: false, error: "Nomor STS tidak valid atau kosong." },
        { status: 400 }
      );
    }

    conn = await getSimpatdaConnection();
    await conn.execute("DELETE FROM tr_tetap WHERE no_sts = ?", [noSts]);

    await prisma.tblPengembalian.update({
      where: { id },
      data: { sent_simpatda: false },
    });

    return NextResponse.json({
      success: true,
      message: `Pengiriman data STS ${noSts} ke database dbsimpatda berhasil dibatalkan.`,
    });
  } catch (err: any) {
    console.error(
      "DELETE /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts/kirim-simpatda error:",
      err
    );
    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          "Gagal membatalkan pengiriman data STS ke database dbsimpatda.",
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
}

export async function PUT() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!isBendaharaAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak." },
        { status: 403 }
      );
    }
    const result = await syncStsFromSimpatda();
    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai (${result.updated} dari ${result.checked} data diperbarui).`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal sinkronisasi dbsimpatda." },
      { status: 500 }
    );
  }
}
