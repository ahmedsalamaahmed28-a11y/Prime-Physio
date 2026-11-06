import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "برايم فيزيو - للعلاج الطبيعي والتغذية العلاجية",
  description: "نظام إدارة العيادات الطبية والملفات الطبية والتقويم والتسويات المالية",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#0d8a8a",
};

import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/LanguageContext";
import { PWAProvider } from "@/components/PWAProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request headers are required for nonce-aware App Router rendering.
  // This opts the application shell into dynamic rendering instead of static HTML.
  await headers();

  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50/50 font-sans">
        <LanguageProvider>
          <PWAProvider>
            <AuthProvider>
              <DashboardLayout>{children}</DashboardLayout>
            </AuthProvider>
          </PWAProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
