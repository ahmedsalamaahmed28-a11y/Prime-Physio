"use client";
import { motion } from "framer-motion";
import { CalendarDays, Users, ClipboardCheck, BarChart3 } from "lucide-react";
const stats = [
  { id: "patients", label: "ملفات المرضى", value: "منظمة", icon: Users },
  { id: "sessions", label: "الجلسات والمواعيد", value: "مترابطة", icon: CalendarDays },
  { id: "records", label: "السجلات الطبية", value: "موثّقة", icon: ClipboardCheck },
  { id: "reports", label: "التقارير والمتابعة", value: "أوضح", icon: BarChart3 },
];
export default function Stats() {
  return <section className="pp-stats" aria-label="إمكانات Prime Physio"><div className="pp-wrap pp-stats-grid">
    {stats.map((stat, index) => { const Icon = stat.icon; return <motion.div key={stat.id} className="pp-stat-item" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.4, delay: index * 0.07 }}>
      <span className="pp-stat-icon"><Icon aria-hidden="true" /></span><div><b>{stat.value}</b><span>{stat.label}</span></div>
    </motion.div>; })}
  </div></section>;
}