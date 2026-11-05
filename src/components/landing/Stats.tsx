"use client";

import { motion } from "framer-motion";
import {
  Building,
  CalendarDays,
  Stethoscope,
  Heart,
  Headphones,
} from "lucide-react";

const stats = [
  { id: "centers", label: "مركز", value: "+100", icon: Building },
  { id: "sessions", label: "جلسة", value: "+25K", icon: CalendarDays },
  { id: "doctors", label: "طبيب", value: "+150", icon: Stethoscope },
  { id: "satisfaction", label: "رضا العملاء", value: "98%", icon: Heart },
  { id: "support", label: "دعم فني", value: "24/7", icon: Headphones },
];

export default function Stats() {
  return (
    <section className="pp-stats" aria-label="إحصائيات Prime Physio">
      <div className="pp-wrap pp-stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              className="pp-stat-item"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -7, scale: 1.035 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: 0.35,
                delay: index * 0.07,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
            >
              <span className="pp-stat-icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
