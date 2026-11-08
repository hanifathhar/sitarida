import { z } from "zod";

export const tahunAnggaranSchema = z.object({
  tahun: z.coerce.number().int().min(2020, "Tahun minimal 2020").max(2100, "Tahun maksimal 2100"),
  nama: z.string().min(3, "Nama tahun anggaran wajib diisi"),
  tahapAktif: z.enum(["MURNI", "PERGESERAN", "PERUBAHAN"]).default("MURNI"),
  status: z.enum(["PERSIAPAN", "AKTIF", "DITUTUP"]).default("PERSIAPAN"),
  isDefault: z.boolean().default(false),
  keterangan: z.string().optional().nullable(),
});

// 1. MASTER REKENING 6 LEVEL (ms_rek1 s/d ms_rek6)
export const msRek1Schema = z.object({
  kd_rek1: z.string().min(1, "Kode Akun 1 wajib diisi").trim(),
  nm_rek1: z.string().min(2, "Uraian Akun 1 wajib diisi").trim(),
  kategori: z
    .enum([
      "ASET",
      "KEWAJIBAN",
      "EKUITAS",
      "PENDAPATAN",
      "BELANJA",
      "PEMBIAYAAN",
      "PENDAPATAN - LO",
      "BEBAN - LO",
    ])
    .default("BELANJA"),
  isActive: z.boolean().default(true),
});

export const msRek2Schema = z.object({
  rek1Id: z.string().uuid("Akun Level 1 induk wajib dipilih"),
  kd_rek2: z.string().min(2, "Kode Akun 2 wajib diisi").trim(),
  nm_rek2: z.string().min(2, "Uraian Akun 2 wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

export const msRek3Schema = z.object({
  rek2Id: z.string().uuid("Akun Level 2 induk wajib dipilih"),
  kd_rek3: z.string().min(3, "Kode Akun 3 wajib diisi").trim(),
  nm_rek3: z.string().min(2, "Uraian Akun 3 wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

export const msRek4Schema = z.object({
  rek3Id: z.string().uuid("Akun Level 3 induk wajib dipilih"),
  kd_rek4: z.string().min(4, "Kode Akun 4 wajib diisi").trim(),
  nm_rek4: z.string().min(2, "Uraian Akun 4 wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

export const msRek5Schema = z.object({
  rek4Id: z.string().uuid("Akun Level 4 induk wajib dipilih"),
  kd_rek5: z.string().min(5, "Kode Akun 5 wajib diisi").trim(),
  nm_rek5: z.string().min(2, "Uraian Akun 5 wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

export const msRek6Schema = z.object({
  rek5Id: z.string().uuid("Akun Level 5 induk wajib dipilih"),
  kd_rek6: z.string().min(6, "Kode Akun 6 wajib diisi").trim(),
  nm_rek6: z.string().min(2, "Uraian Akun 6 wajib diisi").trim(),
  map_lo: z.string().optional().nullable(),
  map_utang: z.string().optional().nullable(),
  map_aset: z.string().optional().nullable(),
  sumberReferensi: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// 2. MASTER OPD (ms_opd)
export const opdSchema = z.object({
  kd_skpd: z.string().min(3, "Kode SKPD/OPD wajib diisi").trim(),
  nm_skpd: z.string().min(3, "Nama Perangkat Daerah wajib diisi").trim(),
  singkatan: z.string().optional().nullable(),
  kd_urusan: z.string().optional().nullable(),
  nm_urusan: z.string().optional().nullable(),
  kepalaNama: z.string().optional().nullable(),
  kepalaNip: z.string().optional().nullable(),
  kepalaJabatan: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  telepon: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// 3. MASTER UNIT KERJA (ms_unit)
export const unitKerjaSchema = z.object({
  opdId: z.string().uuid("OPD induk wajib dipilih"),
  kd_unit: z.string().min(3, "Kode Unit Kerja wajib diisi").trim(),
  nm_unit: z.string().min(3, "Nama Unit Kerja wajib diisi").trim(),
  skpdbank: z.string().optional().nullable(),
  bank_penerima: z.string().optional().nullable(),
  rek_penerima: z.string().optional().nullable(),
  nama_penerima: z.string().optional().nullable(),
  kepalaNama: z.string().optional().nullable(),
  kepalaNip: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// 4. MASTER PROGRAM (ms_program)
export const programSchema = z.object({
  kd_program: z.string().min(1, "Kode program wajib diisi").trim(),
  nm_program: z.string().min(3, "Nama program wajib diisi").trim(),
  kd_urusan: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// 5. MASTER KEGIATAN (ms_kegiatan)
export const kegiatanSchema = z.object({
  programId: z.string().uuid("Program induk wajib dipilih"),
  kd_kegiatan: z.string().min(2, "Kode kegiatan wajib diisi").trim(),
  nm_kegiatan: z.string().min(3, "Nama kegiatan wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

// 6. MASTER SUB KEGIATAN (ms_subkegiatan)
export const subkegiatanSchema = z.object({
  kegiatanId: z.string().uuid("Kegiatan induk wajib dipilih"),
  kd_sub_kegiatan: z.string().min(3, "Kode subkegiatan wajib diisi").trim(),
  nm_sub_kegiatan: z.string().min(3, "Nama subkegiatan wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

// 7. MASTER SUMBER DANA (ms_sumber_dana)
export const sumberDanaSchema = z.object({
  kd_sumdan: z.string().min(1, "Kode sumber dana wajib diisi").trim(),
  nm_sumdan: z.string().min(3, "Nama sumber dana wajib diisi").trim(),
  isActive: z.boolean().default(true),
});

export const importMasterBatchSchema = z.object({
  tahunAnggaranId: z.string().uuid().optional(),
  targetEntitas: z.enum(["REKENING", "PROGRAM", "SUMBER_DANA", "OPD"]),
  rows: z.array(z.record(z.string(), z.any())).min(1, "Data import tidak boleh kosong"),
});
