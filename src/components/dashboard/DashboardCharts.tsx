"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const MONTHLY_DATA = [
  { bulan: "Jan", paguRencana: 26000000, usulanRka: 26000000 },
  { bulan: "Feb", paguRencana: 52000000, usulanRka: 52000000 },
  { bulan: "Mar", paguRencana: 49000000, usulanRka: 49000000 },
  { bulan: "Apr", paguRencana: 108000000, usulanRka: 57000000 },
  { bulan: "Mei", paguRencana: 30000000, usulanRka: 9500000 },
  { bulan: "Jun", paguRencana: 26500000, usulanRka: 9200000 },
  { bulan: "Jul", paguRencana: 17000000, usulanRka: 6200000 },
  { bulan: "Ags", paguRencana: 14000000, usulanRka: 5800000 },
  { bulan: "Sep", paguRencana: 12000000, usulanRka: 0 },
  { bulan: "Okt", paguRencana: 6000000, usulanRka: 0 },
  { bulan: "Nov", paguRencana: 5800000, usulanRka: 0 },
  { bulan: "Des", paguRencana: 6200000, usulanRka: 0 },
];

const STAGE_DATA = [
  { tahap: "Tahap 1", totalPagu: 236217000, totalTerverifikasi: 184817000 },
  { tahap: "Tahap 2", totalPagu: 88490000, totalTerverifikasi: 29900000 },
  { tahap: "Tahap 3", totalPagu: 30750000, totalTerverifikasi: 0 },
];

function formatNumberId(val: number) {
  return new Intl.NumberFormat("id-ID").format(val);
}

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Grafik Kiri: Bar Chart Bulanan (Jan - Des) persis referensi CAKRA */}
      <div className="lg:col-span-8 bg-white rounded-xl p-5 shadow-cakra-card border border-gray-200/80">
        <h3 className="text-center text-sm font-bold text-gray-800 mb-2">
          Total Rencana Anggaran dan Usulan RKA per Bulan
        </h3>
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MONTHLY_DATA}
              margin={{ top: 15, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: "#4B5563" }}
                axisLine={{ stroke: "#D1D5DB" }}
              />
              <YAxis
                tickFormatter={(v) => formatNumberId(v)}
                tick={{ fontSize: 10, fill: "#4B5563" }}
                axisLine={{ stroke: "#D1D5DB" }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `Rp ${formatNumberId(value)}`,
                  "",
                ]}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  borderColor: "#FECACA",
                }}
              />
              <Legend
                verticalAlign="top"
                height={32}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar
                dataKey="paguRencana"
                name="Total Pagu Rencana"
                fill="#B91C1C"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="usulanRka"
                name="Total Usulan Terverifikasi"
                fill="#FCA5A5"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grafik Kanan: Line/Area Chart per Tahap (Tahap 1, Tahap 2, Tahap 3) persis referensi CAKRA */}
      <div className="lg:col-span-4 bg-white rounded-xl p-5 shadow-cakra-card border border-gray-200/80">
        <h3 className="text-center text-sm font-bold text-gray-800 mb-2">
          Total Pagu dan Verifikasi per Tahap
        </h3>
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={STAGE_DATA}
              margin={{ top: 15, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="tahap"
                tick={{ fontSize: 11, fill: "#4B5563" }}
                axisLine={{ stroke: "#D1D5DB" }}
              />
              <YAxis
                tickFormatter={(v) => formatNumberId(v)}
                tick={{ fontSize: 10, fill: "#4B5563" }}
                axisLine={{ stroke: "#D1D5DB" }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `Rp ${formatNumberId(value)}`,
                  "",
                ]}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  borderColor: "#FECACA",
                }}
              />
              <Legend
                verticalAlign="top"
                height={32}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Area
                type="monotone"
                dataKey="totalPagu"
                name="Total Pagu"
                stroke="#991B1B"
                strokeWidth={2.5}
                fill="#FEE2E2"
                fillOpacity={0.65}
                dot={{ r: 4, fill: "#991B1B" }}
              />
              <Area
                type="monotone"
                dataKey="totalTerverifikasi"
                name="Terverifikasi"
                stroke="#F87171"
                strokeWidth={2.5}
                fill="#FEF2F2"
                fillOpacity={0.5}
                dot={{ r: 4, fill: "#EF4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

