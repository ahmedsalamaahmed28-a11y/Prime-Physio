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
  const [phase, setPhase] = useState<"blank" | "reset" | "rolling" | "settled">("blank");
  const [showDigits, setShowDigits] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("settled");
      setShowDigits(true);
      return;
    }

    // Start the wheels moving while invisible, then reveal them mid-roll.
    setPhase("reset");
    setShowDigits(false);

    let firstFrame = 0;
    let secondFrame = 0;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setPhase("rolling");
        revealTimer = setTimeout(() => setShowDigits(true), 180);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, []);

  return (
    <span aria-label={value} className="pp-stat-number tabular-nums">
      <span aria-hidden="true">{prefix}</span>
      <span
        className={`pp-stat-odometer${showDigits ? " is-visible" : ""}`}
        aria-hidden="true"
        dir="ltr"
      >
        {Array.from(digits).map((character, index) => {
          if (!/[0-9]/.test(character)) {
            return <span className="pp-stat-separator" key={`separator-${index}`}>{character}</span>;
          }

          const rollTo = 30 + Number(character);
          return (
            <span className="pp-stat-digit-window" key={`digit-${index}`}>
              <span
                className={`pp-stat-digit-strip pp-stat-roll-${rollTo}${phase === "reset" ? " is-reset" : phase === "rolling" || phase === "settled" ? " is-rolling" : ""}`}
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
