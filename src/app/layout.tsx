import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased"
    >
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
