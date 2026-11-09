import React from "react";
import RkaDpaSkpdView from "@/components/perencanaan/RkaDpaSkpdView";

export const metadata = {
  title: "DPA SKPD - SITARIDA",
  description:
    "Formulir Ringkasan Dokumen Pelaksanaan Anggaran Satuan Kerja Perangkat Daerah (DPA SKPD)",
};

export default function DpaSkpdPage() {
  return <RkaDpaSkpdView mode="DPA" />;
}

