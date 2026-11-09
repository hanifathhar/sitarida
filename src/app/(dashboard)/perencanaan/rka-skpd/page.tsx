import React from "react";
import RkaDpaSkpdView from "@/components/perencanaan/RkaDpaSkpdView";

export const metadata = {
  title: "RKA SKPD",
  description:
    "Formulir Ringkasan Rencana Kerja dan Anggaran Satuan Kerja Perangkat Daerah (RKA SKPD)",
};

export default function RkaSkpdPage() {
  return <RkaDpaSkpdView mode="RKA" />;
}

