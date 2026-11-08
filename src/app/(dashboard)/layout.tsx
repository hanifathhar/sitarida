import React from "react";
import { redirect } from "next/navigation";
import { getSession, getSelectedTahunAnggaranId } from "@/lib/session";
import { enrichSessionWithLivePermissions } from "@/lib/rbac";
import {
  listTahunAnggaran,
  getActiveTahunAnggaran,
} from "@/modules/master-data/master-data.service";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawSession = await getSession();
  if (!rawSession) {
    redirect("/login");
  }

  const cookieTahunId = await getSelectedTahunAnggaranId();
  const [session, tahunList, activeTahun] = await Promise.all([
    enrichSessionWithLivePermissions(rawSession),
    listTahunAnggaran(),
    getActiveTahunAnggaran(cookieTahunId || rawSession.tahunAnggaranId),
  ]);

  if (!activeTahun) {
    return <div className="p-8">Tahun Anggaran belum dikonfigurasi.</div>;
  }

  return (
    <AppShell
      session={session}
      tahunList={tahunList.map((t) => ({
        id: t.id,
        tahun: t.tahun,
        nama: t.nama,
        tahapAktif: t.tahapAktif,
        status: t.status,
      }))}
      activeTahun={{
        id: activeTahun.id,
        tahun: activeTahun.tahun,
        nama: activeTahun.nama,
        tahapAktif: activeTahun.tahapAktif,
        status: activeTahun.status,
      }}
    >
      {children}
    </AppShell>
  );
}
