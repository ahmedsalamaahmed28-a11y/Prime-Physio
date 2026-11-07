"use client";

import { useEffect, useRef, useState } from "react";
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
  const elementRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  const match = value.match(/^([^0-9]*)([0-9,]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2].replace(/,/g, "")) : 0;
  const suffix = match?.[3] ?? "";

  useEffect(() => {
    const element = elementRef.current;
    if (!element || started) return;

    const startCounting = () => {
      setStarted(true);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        setCount(target);
        return;
      }

      const duration = 1600;
      let animationFrame = 0;
      let startTime = 0;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 4);
        setCount(Math.round(target * easedProgress));

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };

      animationFrame = window.requestAnimationFrame(animate);
      return () => window.cancelAnimationFrame(animationFrame);
    };

    if (typeof IntersectionObserver === "undefined") {
      const cleanup = startCounting();
      return typeof cleanup === "function" ? cleanup : undefined;
    }

    let cleanupAnimation: (() => void) | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cleanupAnimation = startCounting();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cleanupAnimation?.();
    };
  }, [started, target]);

  return (
    <span ref={elementRef} aria-label={value} className="tabular-nums">
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
