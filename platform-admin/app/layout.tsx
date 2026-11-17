import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Prime Physio | Platform Control",
  description: "إدارة منصة Prime Physio"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}