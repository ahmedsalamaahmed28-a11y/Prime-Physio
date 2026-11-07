"use client";

import {
  Building,
  CalendarDays,
  Stethoscope,
  Activity,
  Mail,
} from "lucide-react";

const stats = [
  { id: "centers", label: "مركز", value: "+100", icon: Building },
  { id: "sessions", label: "جلسة", value: "+25K", icon: CalendarDays },
  { id: "doctors", label: "طبيب", value: "+150", icon: Stethoscope },
  { id: "satisfaction", label: "رضا العملاء", value: "98%", icon: Activity },
  { id: "support", label: "دعم فني", value: "24/7", icon: Mail },
];

export default function Stats() {
  return (
    <section className="pp-stats" aria-label="إحصائيات Prime Physio">
      <div className="pp-wrap pp-stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              data-csp-motion="reveal"
              className="pp-stat-item"
            >
              <span className="pp-stat-icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
