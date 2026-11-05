"use client";
import { Activity, CalendarDays, ClipboardList, CreditCard, ShieldCheck, Users } from "lucide-react";
const capabilities = [
  { icon: CalendarDays, label: "المواعيد والجلسات" },
  { icon: ClipboardList, label: "الملفات الطبية" },
  { icon: CreditCard, label: "الحسابات والتقارير" },
  { icon: Users, label: "فريق العمل" },
  { icon: ShieldCheck, label: "الأدوار والصلاحيات" },
  { icon: Activity, label: "متابعة المركز" },
];
export default function TrustedStrip() {
  return <section className="pp-capabilities"><div className="pp-wrap">
    <p className="pp-capabilities-title">كل أدوات إدارة مركز العلاج الطبيعي في منصة واحدة</p>
    <div className="pp-capabilities-list">{capabilities.map((item) => { const Icon = item.icon; return <div className="pp-capability" key={item.label}><Icon aria-hidden="true" /><span>{item.label}</span></div>; })}</div>
  </div></section>;
}