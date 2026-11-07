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
  const digits = match?.[2] ?? "0";
  const suffix = match?.[3] ?? "";
  const [phase, setPhase] = useState<"blank" | "settled" | "rolling">("blank");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("settled");
      return;
    }

    // Keep the statistic visually empty until the rolling animation begins.
    // It starts on mount, without waiting for scroll/reveal.
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setPhase("rolling"));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <span
      aria-label={value}
      className="pp-stat-number tabular-nums"
      style={{ visibility: phase === "blank" ? "hidden" : "visible" }}
    >
      <span aria-hidden="true">{prefix}</span>
      <span className="pp-stat-odometer" aria-hidden="true" dir="ltr">
        {Array.from(digits).map((character, index) => {
          if (!/[0-9]/.test(character)) {
            return <span className="pp-stat-separator" key={`separator-${index}`}>{character}</span>;
          }

          const rollTo = 30 + Number(character);
          // Match the offset to the exact height of each digit row.
          const targetOffset = rollTo * 1.08;
          return (
            <span className="pp-stat-digit-window" key={`digit-${index}`}>
              <span
                className={`pp-stat-digit-strip${phase === "rolling" ? " is-rolling" : ""}`}
                style={{ "--roll-y": `${phase === "settled" ? -targetOffset : phase === "blank" ? 0 : -targetOffset}em` } as React.CSSProperties}
              >
                {"0123456789".repeat(4).split("").map((digit, digitIndex) => (
                  <span className="pp-stat-digit" key={digitIndex}>{digit}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      <span aria-hidden="true">{suffix}</span>
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
            <div key={stat.id} className="pp-stat-item">
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
