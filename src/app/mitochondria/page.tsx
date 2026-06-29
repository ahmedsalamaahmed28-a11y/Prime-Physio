"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Activity, Sparkles, Zap } from "lucide-react";

const facts = [
  {
    icon: Zap,
    label: "ATP Output",
    value: "Energy currency",
    text: "The inner membrane turns food-derived electrons into ATP, the molecule cells spend for work.",
  },
  {
    icon: Activity,
    label: "Cristae",
    value: "Folded surface",
    text: "Deep folds increase membrane area, giving protein complexes more room to generate energy.",
  },
  {
    icon: Sparkles,
    label: "Matrix",
    value: "Reaction hub",
    text: "The central fluid space hosts enzymes, mitochondrial DNA, and key steps of metabolism.",
  },
];

export default function MitochondriaPage() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = sceneRef.current;
    if (!root) return;
    const mitoShell = root.querySelector(".mito-shell");
    if (!mitoShell) return;

    const animations = [
      animate(mitoShell, {
        scale: [0.985, 1.02],
        rotate: [-1.2, 1.2],
        duration: 3200,
        alternate: true,
        loop: true,
        ease: "inOutSine",
      }),
      animate(root.querySelectorAll(".crista"), {
        strokeDashoffset: [620, 0],
        opacity: [0.45, 1],
        duration: 2400,
        delay: stagger(180),
        alternate: true,
        loop: true,
        ease: "inOutCubic",
      }),
      animate(root.querySelectorAll(".electron"), {
        translateX: ["-18px", "340px"],
        opacity: [0, 1, 1, 0],
        scale: [0.55, 1.15, 0.55],
        duration: 2600,
        delay: stagger(320),
        loop: true,
        ease: "inOutQuad",
      }),
      animate(root.querySelectorAll(".atp"), {
        translateY: ["24px", "-58px"],
        translateX: ["0px", "18px"],
        opacity: [0, 1, 0],
        scale: [0.45, 1, 0.7],
        duration: 2100,
        delay: stagger(240),
        loop: true,
        ease: "outCubic",
      }),
      animate(root.querySelectorAll(".label-line"), {
        scaleX: [0, 1],
        opacity: [0, 1],
        duration: 900,
        delay: stagger(180, { start: 500 }),
        ease: "outCubic",
      }),
      animate(root.querySelectorAll(".fact-card"), {
        translateY: [18, 0],
        opacity: [0, 1],
        duration: 700,
        delay: stagger(120, { start: 250 }),
        ease: "outCubic",
      }),
    ];

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <main ref={sceneRef} className="min-h-screen overflow-hidden bg-[#f7fbff] text-slate-900" dir="ltr">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(20,167,171,0.18),transparent_28%),radial-gradient(circle_at_78%_10%,rgba(255,160,0,0.18),transparent_26%),linear-gradient(135deg,#f7fbff_0%,#eef8f6_46%,#fff7e6_100%)]" />

        <div className="relative z-10 flex flex-col gap-7 lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Anime.js cell lab
            </div>
            <div>
              <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Mitochondria
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                A tiny animated tour of the cell&apos;s energy factory: folded cristae, moving electrons, and ATP packets rising from the inner membrane.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {facts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <article key={fact.label} className="fact-card rounded-lg border border-white/80 bg-white/85 p-4 opacity-0 shadow-sm backdrop-blur">
                    <Icon className="mb-3 h-5 w-5 text-teal-700" />
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{fact.label}</p>
                    <h2 className="mt-1 text-sm font-black text-slate-900">{fact.value}</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{fact.text}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center py-8">
            <div className="relative aspect-[1.12/1] w-full max-w-2xl">
              <svg viewBox="0 0 720 640" className="h-full w-full drop-shadow-2xl" role="img" aria-label="Animated mitochondria diagram">
                <defs>
                  <linearGradient id="mitoOuter" x1="80" x2="650" y1="80" y2="560">
                    <stop stopColor="#14a7ab" />
                    <stop offset="0.55" stopColor="#36c2a5" />
                    <stop offset="1" stopColor="#ffa000" />
                  </linearGradient>
                  <linearGradient id="mitoInner" x1="110" x2="590" y1="130" y2="520">
                    <stop stopColor="#e6fffb" />
                    <stop offset="1" stopColor="#fff3cf" />
                  </linearGradient>
                  <filter id="softGlow">
                    <feGaussianBlur stdDeviation="9" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <path
                  className="mito-shell origin-center"
                  d="M104 328C104 178 214 86 363 92c146 6 263 89 276 218 14 137-88 239-247 246-166 7-288-78-288-228Z"
                  fill="url(#mitoOuter)"
                  opacity="0.92"
                />
                <path
                  d="M135 326c0-124 91-201 229-197 127 4 232 74 244 184 12 114-78 198-218 204-145 6-255-65-255-191Z"
                  fill="url(#mitoInner)"
                  opacity="0.98"
                />

                {[
                  "M184 235c46-34 85 10 129-18 45-29 69-58 116-34 38 19 40 62 87 54",
                  "M164 318c59-45 96 32 151-5 54-37 83-68 136-28 43 32 68 10 106-9",
                  "M184 408c51-30 79 19 125-8 46-26 58-67 116-39 41 20 73 38 119 5",
                  "M252 491c34-43 65-8 104-35 33-23 56-50 100-25",
                ].map((d) => (
                  <path
                    key={d}
                    className="crista"
                    d={d}
                    fill="none"
                    stroke="#0e7578"
                    strokeDasharray="620"
                    strokeDashoffset="620"
                    strokeLinecap="round"
                    strokeWidth="18"
                  />
                ))}

                {[160, 220, 280, 340, 400].map((y, index) => (
                  <circle key={y} className="electron" cx="130" cy={y} r={index % 2 ? 7 : 5} fill="#f97316" filter="url(#softGlow)" opacity="0" />
                ))}

                {[250, 305, 360, 415, 470, 525].map((x, index) => (
                  <g key={x} className="atp" opacity="0">
                    <circle cx={x} cy={500 - (index % 2) * 36} r="18" fill="#ffb703" />
                    <text x={x} y={506 - (index % 2) * 36} textAnchor="middle" className="fill-slate-900 text-[13px] font-black">
                      ATP
                    </text>
                  </g>
                ))}

                <g className="text-slate-800">
                  <line className="label-line origin-left" x1="470" y1="136" x2="620" y2="78" stroke="#334155" strokeWidth="2" />
                  <text x="628" y="79" className="fill-slate-700 text-[18px] font-bold">Outer membrane</text>
                  <line className="label-line origin-left" x1="432" y1="302" x2="628" y2="282" stroke="#334155" strokeWidth="2" />
                  <text x="636" y="287" className="fill-slate-700 text-[18px] font-bold">Cristae folds</text>
                  <line className="label-line origin-left" x1="310" y1="444" x2="160" y2="565" stroke="#334155" strokeWidth="2" />
                  <text x="34" y="590" className="fill-slate-700 text-[18px] font-bold">Matrix enzymes</text>
                </g>
              </svg>

              <div className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
                <Activity className="h-4 w-4 text-orange-500" />
                Electrons flow across the inner membrane
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
