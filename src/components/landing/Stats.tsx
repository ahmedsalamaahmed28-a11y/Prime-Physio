"use client";

import { useEffect, useState } from "react";
import {
  Building,
  CalendarDays,
  Stethoscope,
  Activity,
  Mail,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const stats = [
  { id: "centers", label: { ar: "مركز", en: "Clinics" }, value: "+100", icon: Building },
  { id: "sessions", label: { ar: "جلسة", en: "Sessions" }, value: "+25K", icon: CalendarDays },
  { id: "doctors", label: { ar: "طبيب", en: "Therapists" }, value: "+150", icon: Stethoscope },
  { id: "satisfaction", label: { ar: "رضا العملاء", en: "Satisfaction" }, value: "98%", icon: Activity },
  { id: "support", label: { ar: "دعم فني", en: "Support" }, value: "24/7", icon: Mail },
];

function AnimatedStatValue({ value }: { value: string }) {
  const match = value.match(/^([^0-9]*)([0-9,]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2].replace(/,/g, "")) : 0;
  const suffix = match?.[3] ?? "";

  // Render the final value in server HTML so the counters never remain at zero
  // if client-side hydration is delayed or unavailable.
  const [count, setCount] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      return;
    }

    // Start the animation only after hydration. The server-rendered value above
    // remains a safe fallback if JavaScript does not hydrate this component.
    setCount(0);

    const duration = 1800;
    let animationFrame = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(target * easedProgress);

      setCount(progress === 1 ? target : nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [target]);

  return (
    <span aria-label={value} className="tabular-nums">
      {prefix}{count.toLocaleString("en-US")}{suffix}
    </span>
  );
}

export default function Stats() {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  return (
    <section
      className="pp-stats"
      aria-label={isEnglish ? "Prime Physio statistics" : "إحصائيات Prime Physio"}
      dir={isEnglish ? "ltr" : "rtl"}
    >
      <div className="pp-wrap pp-stats-grid">
        {stats.map((stat) => {
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
                <b><AnimatedStatValue value={stat.value} /></b>
                <span>{stat.label[language]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
