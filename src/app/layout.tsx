import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SITARIDA",
  description: "Sistem Informasi Penatausahaan Keuangan Terintegrasi Daerah",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

