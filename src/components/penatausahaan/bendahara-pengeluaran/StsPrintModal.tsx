"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import { terbilang } from "@/lib/utils";

interface StsPrintModalProps {
  open: boolean;
  item: any | null;
  onClose: () => void;
}

function formatNominalEn(val: number | string | null | undefined): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function StsPrintModal({
  open,
  item,
  onClose,
}: StsPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!open || !item) return null;

  const nilaiNum = Number(item.nilai) || 0;
  const nominalFormatted = formatNominalEn(nilaiNum);
  const terbilangText = terbilang(Math.round(nilaiNum));
  const unitOrSkpd = item.nm_unit || item.nm_skpd || item.opd?.nm_skpd || "";
  const tahun = item.tahunAnggaran || 2026;
  const nomorSts = item.no_sts || item.no_tetap || "-";

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const printContents = printAreaRef.current.innerHTML;
    const win = window.open("", "_blank", "width=950,height=750");
    if (!win) {
      window.print();
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak STS - ${nomorSts}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              margin: 0;
              padding: 16px;
              font-size: 11px;
              line-height: 1.35;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .sts-border {
              border: 1.5px solid #000;
            }
            .sts-cell {
              border: 1px solid #000;
              padding: 6px 8px;
              vertical-align: top;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .italic { font-style: italic; }
            .info-table td {
              padding: 2px 4px;
              vertical-align: top;
            }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar */}
        <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-sm font-bold">
                Pratinjau Cetak Surat Tanda Setoran (STS)
              </h3>
              <p className="text-[11px] text-white/80 font-mono">
                No. STS: {nomorSts}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak STS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
          <div
            ref={printAreaRef}
            className="bg-white mx-auto p-6 shadow-md border border-slate-300 text-black"
            style={{
              maxWidth: "800px",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "11px",
              lineHeight: 1.35,
            }}
          >
            {/* Main Outer STS Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1.5px solid #000",
              }}
            >
              <tbody>
                {/* Row 1: Header 3 Kolom */}
                <tr>
                  <td
                    style={{
                      width: "36%",
                      border: "1px solid #000",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "10px" }}>
                      PEMERINTAH KABUPATEN TAPANULI SELATAN
                    </div>
                    <div style={{ margin: "6px 0", display: "flex", justifyContent: "center" }}>
                      <img
                        src="/logo_tapsel.png"
                        alt="Logo Tapanuli Selatan"
                        style={{ height: "48px", width: "auto", objectFit: "contain" }}
                      />
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "10px" }}>
                      BADAN PENGELOLA KEUANGAN,
                      <br />
                      PENDAPATAN DAN ASET DAERAH
                    </div>
                  </td>

                  <td
                    style={{
                      width: "28%",
                      border: "1px solid #000",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                      SURAT TANDA SETORAN
                      <br />
                      (STS)
                    </div>
                  </td>

                  <td
                    style={{
                      width: "36%",
                      border: "1px solid #000",
                      padding: "8px",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: "98px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                          NOMOR STS :
                        </div>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "13px",
                            marginTop: "2px",
                            wordBreak: "break-all",
                          }}
                        >
                          {nomorSts}
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", marginTop: "12px" }}>
                        Setoran seperti ini yang terakhir
                        <br />
                        telah dilakukan pada tanggal......
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Row 2: Info Setoran & Rekening Kasda */}
                <tr>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "6px 8px",
                      verticalAlign: "top",
                      fontSize: "10px",
                    }}
                  >
                    <div>Setoran seperti ini adalah yang ke......</div>
                    <div>dalam tahun</div>
                    <div>Kepada Kas Kabupaten Tapanuli Selatan</div>
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      border: "1px solid #000",
                      padding: "6px 8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                      fontSize: "10px",
                    }}
                  >
                    <div>REKENING KAS UMUM DAERAH KABUPATEN TAPANULI SELATAN</div>
                    <div>AC. 233.01.02.000001-4 PADA PT. BANK SUMUT</div>
                    <div>CABANG SIPIROK</div>
                  </td>
                </tr>

                {/* Row 3: Identitas Penyetor, Nominal, Terbilang, Uraian */}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      border: "1px solid #000",
                      padding: "10px 14px",
                      verticalAlign: "top",
                    }}
                  >
                    <table
                      className="info-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ width: "175px", padding: "2px 4px" }}>
                            Nama Penyetor
                          </td>
                          <td style={{ width: "12px", padding: "2px 4px" }}>:</td>
                          <td style={{ padding: "2px 4px" }}>
                            {item.nama_penyetor || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "2px 4px" }}>Alamat</td>
                          <td style={{ padding: "2px 4px" }}>:</td>
                          <td style={{ padding: "2px 4px" }}>
                            {item.alamat_penyetor || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "2px 4px" }}>UNIT/SKPD</td>
                          <td style={{ padding: "2px 4px" }}>:</td>
                          <td style={{ padding: "2px 4px" }}>{unitOrSkpd}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} style={{ height: "10px" }} />
                        </tr>
                        <tr>
                          <td style={{ padding: "2px 4px" }}>
                            Harap menerima uang sebesar
                          </td>
                          <td style={{ padding: "2px 4px", fontWeight: "bold" }}>:</td>
                          <td
                            style={{
                              padding: "2px 4px",
                              fontWeight: "bold",
                              fontSize: "12px",
                            }}
                          >
                            Rp.{nominalFormatted}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "2px 4px", fontStyle: "italic" }}>
                            (Dengan Huruf)
                          </td>
                          <td style={{ padding: "2px 4px" }}>:</td>
                          <td style={{ padding: "2px 4px", fontStyle: "italic" }}>
                            ({terbilangText})
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3} style={{ padding: "4px 4px 2px 4px" }}>
                            Yaitu,
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "2px 4px" }}>Penerimaan dari</td>
                          <td style={{ padding: "2px 4px" }}>:</td>
                          <td style={{ padding: "2px 4px" }}>
                            {item.uraian}
                            {tahun &&
                            !String(item.uraian || "").includes(String(tahun))
                              ? ` T.A ${tahun}`
                              : ""}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 4: Header Tabel Rincian */}
                <tr>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Kode Rekening
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Uraian Rincian Objek
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Jumlah (Rp.)
                  </td>
                </tr>

                {/* Row 5: Baris Data Rincian */}
                <tr>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                      fontFamily: "monospace",
                    }}
                  >
                    {item.kd_rek6 || "-"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                    }}
                  >
                    {item.nm_rek6 || "-"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "5px 8px",
                      textAlign: "right",
                    }}
                  >
                    {nominalFormatted}
                  </td>
                </tr>

                {/* Row 6: Tanda Tangan */}
                <tr>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      height: "110px",
                    }}
                  />
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "bottom",
                      height: "110px",
                    }}
                  >
                    <div>(...........................)</div>
                    <div>Penyetor</div>
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "top",
                      height: "110px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: "100%",
                      }}
                    >
                      <div>
                        Uang tersebut diatas telah diterima
                        <br />
                        ................tgl................
                      </div>
                      <div style={{ marginTop: "36px" }}>
                        <div>(...........................)</div>
                        <div>Penerima</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer Keterangan */}
            <div style={{ marginTop: "10px", fontSize: "10px" }}>
              <div
                style={{
                  textDecoration: "underline",
                  marginBottom: "4px",
                  fontWeight: "bold",
                }}
              >
                Keterangan :
              </div>
              <table style={{ borderCollapse: "collapse", width: "auto" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "1px 16px 1px 0" }}>1.</td>
                    <td style={{ padding: "1px 0" }}>
                      Lembar putih untuk Arsip WP/WR.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "1px 16px 1px 0" }}>2.</td>
                    <td style={{ padding: "1px 0" }}>
                      Lembar merah untuk Bank Penerima.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "1px 16px 1px 0" }}>3.</td>
                    <td style={{ padding: "1px 0" }}>
                      Lembar kuning untuk Bidang Pendapatan BPKPAD.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "1px 16px 1px 0" }}>4.</td>
                    <td style={{ padding: "1px 0" }}>
                      Lembar hijau untuk Kuasa BUD.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "1px 16px 1px 0" }}>5.</td>
                    <td style={{ padding: "1px 0" }}>
                      Lembar biru untuk Bidang Akutansi dan Pelaporan BPKPAD.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
