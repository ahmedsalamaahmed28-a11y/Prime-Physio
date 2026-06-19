"use client";

import React from "react";
import { useLanguage } from "@/lib/LanguageContext";

interface DataPoint {
  date: string;
  vasScore: number;
  label: string;
}

interface ProgressChartsProps {
  data: DataPoint[];
}

export default function ProgressCharts({ data }: ProgressChartsProps) {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        {isRtl ? "لا تتوفر جلسات كافية لرسم مؤشرات المتابعة." : "Not enough session data to plot progress chart."}
      </div>
    );
  }

  // Reverse data to display chronologically (left to right)
  const chartData = [...data].reverse();

  // Dimensions
  const width = 500;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Grid / Axis variables
  const maxVas = 10;
  
  // Calculate SVG Coordinates for each point
  const points = chartData.map((d, index) => {
    const x = paddingLeft + (index / (chartData.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.vasScore / maxVas) * chartHeight;
    return { x, y, raw: d };
  });

  // Build the SVG path data
  const pathD = points.reduce((acc, p, index) => {
    if (index === 0) {
      return `M ${p.x} ${p.y}`;
    }
    // Curved/Smooth line
    const prev = points[index - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, "");

  // Build area path for gradient
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 p-5 rounded-2xl shadow-xs w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            {isRtl ? "مؤشر تحسن مستوى الألم (VAS)" : "Pain Severity Level Index (VAS)"}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRtl 
              ? "متابعة هبوط مستويات الألم مع تكرار جلسات العلاج الطبيعي" 
              : "Tracking pain decrease over physical therapy sessions"}
          </p>
        </div>
        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-full">
          {isRtl ? "نشط" : "Active"}
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            {/* Smooth color gradient for Area under line */}
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d8a8a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d8a8a" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 6 }).map((_, i) => {
            const val = i * 2;
            const y = paddingTop + chartHeight - (val / maxVas) * chartHeight;
            return (
              <g key={i} className="opacity-40">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-medium fill-slate-400 font-sans">{val}</text>
              </g>
            );
          })}

          {/* Render Area under line */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}

          {/* Render Line */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#0d8a8a" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              className="drop-shadow-[0_2px_4px_rgba(13,138,138,0.2)]" 
            />
          )}

          {/* Render Interactive Data Points */}
          {points.map((p, index) => (
            <g key={index} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4" 
                fill="#ffffff" 
                stroke="#0d8a8a" 
                strokeWidth="2" 
                className="transition-transform group-hover:scale-125"
              />
              
              {/* Highlight background point */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="8" 
                fill="#0d8a8a" 
                className="opacity-0 group-hover:opacity-10 transition-opacity"
              />

              {/* Tooltip or Popover on Hover */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                <rect 
                  x={p.x - 45} 
                  y={p.y - 30} 
                  width="90" 
                  height="22" 
                  rx="4" 
                  fill="#1e293b" 
                />
                <text 
                  x={p.x} 
                  y={p.y - 15} 
                  fill="#ffffff" 
                  textAnchor="middle" 
                  className="text-[9px] font-bold font-sans"
                >
                  {isRtl ? `ألم: ${p.raw.vasScore}/10` : `Pain: ${p.raw.vasScore}/10`}
                </text>
              </g>

              {/* Axis Label (Session dates) */}
              <text 
                x={p.x} 
                y={height - 12} 
                textAnchor="middle" 
                className="text-[9px] fill-slate-400 font-medium"
              >
                {p.raw.date.substring(5)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span>{isRtl ? "المستوى 0 = لا يوجد ألم" : "Level 0 = Pain Free"}</span>
        <span>{isRtl ? "المستوى 10 = أشد ألم ممكن" : "Level 10 = Max Pain"}</span>
      </div>
    </div>
  );
}
