"use client";

import { Building, CalendarDays, ClipboardList, Users, Activity } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const capabilities = [
  { id: "patients", icon: ClipboardList, ar: "ملفات المرضى", en: "Patient records" },
  { id: "sessions", icon: CalendarDays, ar: "الجلسات والمواعيد", en: "Sessions & appointments" },
  { id: "team", icon: Users, ar: "إدارة فريق العمل", en: "Team management" },
  { id: "reports", icon: ChartNoAxesCombined, ar: "التقارير والمتابعة", en: "Reports & tracking" },
  { id: "clinic", icon: Building2, ar: "إدارة المركز", en: "Clinic management" },
];

export default function Stats() {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  return (
    <section className="pp-stats" aria-label={isEnglish ? "Prime Physio capabilities" : "إمكانيات Prime Physio"} dir={isEnglish ? "ltr" : "rtl"}>
      <div className="pp-wrap pp-stats-grid">
        {capabilities.map(({ id, icon: Icon, ar, en }) => (
          <div key={id} className="pp-stat-item">
            <span className="pp-stat-icon"><Icon aria-hidden="true" /></span>
            <div><b className="pp-stat-capability">{isEnglish ? en : ar}</b></div>
          </div>
        ))}
      </div>
    </section>
  );
}
