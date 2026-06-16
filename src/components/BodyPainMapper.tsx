"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export interface BodyRegion {
  id: string;
  nameAr: string;
  nameEn: string;
  view: "anterior" | "posterior";
  path?: string; // SVG path data or shape specifier
  type: "path" | "rect" | "circle";
  // Custom dimensions for shapes
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const BODY_PAIN_REGIONS: BodyRegion[] = [
  // ─── ANTERIOR (Front View) ──────────────────────────────────────────────────
  { id: "ant-head", nameAr: "الرأس (أماكن أمامية)", nameEn: "Head (Front)", view: "anterior", type: "circle", cx: 100, cy: 35, r: 20 },
  { id: "ant-neck", nameAr: "الرقبة (أمامية)", nameEn: "Neck (Front)", view: "anterior", type: "rect", x: 92, y: 55, width: 16, height: 12 },
  { id: "ant-shoulder-r", nameAr: "الكتف الأيمن", nameEn: "Right Shoulder", view: "anterior", type: "path", path: "M 60 70 L 73 70 L 70 85 L 58 80 Z" },
  { id: "ant-shoulder-l", nameAr: "الكتف الأيسر", nameEn: "Left Shoulder", view: "anterior", type: "path", path: "M 127 70 L 140 70 L 142 80 L 130 85 Z" },
  { id: "ant-arm-r", nameAr: "العضد الأيمن", nameEn: "Right Upper Arm", view: "anterior", type: "path", path: "M 57 82 L 68 87 L 60 115 L 50 110 Z" },
  { id: "ant-arm-l", nameAr: "العضد الأيسر", nameEn: "Left Upper Arm", view: "anterior", type: "path", path: "M 132 87 L 143 82 L 150 110 L 140 115 Z" },
  { id: "ant-forearm-r", nameAr: "الساعد الأيمن", nameEn: "Right Forearm", view: "anterior", type: "path", path: "M 48 112 L 58 117 L 48 145 L 38 140 Z" },
  { id: "ant-forearm-l", nameAr: "الساعد الأيسر", nameEn: "Left Forearm", view: "anterior", type: "path", path: "M 142 117 L 152 112 L 162 140 L 152 145 Z" },
  { id: "ant-hand-r", nameAr: "اليد اليمنى", nameEn: "Right Hand", view: "anterior", type: "circle", cx: 34, cy: 147, r: 7 },
  { id: "ant-hand-l", nameAr: "اليد اليسرى", nameEn: "Left Hand", view: "anterior", type: "circle", cx: 166, cy: 147, r: 7 },
  { id: "ant-trunk", nameAr: "الجزع", nameEn: "Trunk", view: "anterior", type: "path", path: "M 75 70 L 125 70 L 120 135 L 80 135 Z" },
  { id: "ant-pelvis", nameAr: "الحوض", nameEn: "Pelvis", view: "anterior", type: "path", path: "M 80 137 L 120 137 L 115 155 L 85 155 Z" },
  { id: "ant-thigh-r", nameAr: "الفخذ الأيمن", nameEn: "Right Thigh", view: "anterior", type: "path", path: "M 75 157 L 98 157 L 92 200 L 70 195 Z" },
  { id: "ant-thigh-l", nameAr: "الفخذ الأيسر", nameEn: "Left Thigh", view: "anterior", type: "path", path: "M 102 157 L 125 157 L 130 195 L 108 200 Z" },
  { id: "ant-knee-r", nameAr: "الركبة اليمنى", nameEn: "Right Knee", view: "anterior", type: "circle", cx: 80, cy: 208, r: 8 },
  { id: "ant-knee-l", nameAr: "الركبة اليسرى", nameEn: "Left Knee", view: "anterior", type: "circle", cx: 120, cy: 208, r: 8 },
  { id: "ant-shin-r", nameAr: "الساق اليمنى", nameEn: "Right Shin", view: "anterior", type: "path", path: "M 74 216 L 86 216 L 82 260 L 72 260 Z" },
  { id: "ant-shin-l", nameAr: "الساق اليسرى", nameEn: "Left Shin", view: "anterior", type: "path", path: "M 114 216 L 126 216 L 128 260 L 118 260 Z" },
  { id: "ant-foot-r", nameAr: "القدم اليمنى", nameEn: "Right Foot", view: "anterior", type: "path", path: "M 70 262 L 82 262 L 84 275 L 65 275 Z" },
  { id: "ant-foot-l", nameAr: "القدم اليسرى", nameEn: "Left Foot", view: "anterior", type: "path", path: "M 118 262 L 130 262 L 135 275 L 116 275 Z" },

  // ─── POSTERIOR (Back View) ──────────────────────────────────────────────────
  { id: "post-head", nameAr: "الرأس (خلفي)", nameEn: "Head (Back)", view: "posterior", type: "circle", cx: 100, cy: 35, r: 20 },
  { id: "post-neck", nameAr: "الرقبة (خلفية)", nameEn: "Neck (Back)", view: "posterior", type: "rect", x: 92, y: 55, width: 16, height: 12 },
  { id: "post-shoulder-r", nameAr: "الكتف الأيمن (خلفي)", nameEn: "Right Shoulder (Back)", view: "posterior", type: "path", path: "M 127 70 L 140 70 L 142 80 L 130 85 Z" },
  { id: "post-shoulder-l", nameAr: "الكتف الأيسر (خلفي)", nameEn: "Left Shoulder (Back)", view: "posterior", type: "path", path: "M 60 70 L 73 70 L 70 85 L 58 80 Z" },
  { id: "post-arm-r", nameAr: "العضد الأيمن (خلفي)", nameEn: "Right Upper Arm (Back)", view: "posterior", type: "path", path: "M 132 87 L 143 82 L 150 110 L 140 115 Z" },
  { id: "post-arm-l", nameAr: "العضد الأيسر (خلفي)", nameEn: "Left Upper Arm (Back)", view: "posterior", type: "path", path: "M 57 82 L 68 87 L 60 115 L 50 110 Z" },
  { id: "post-forearm-r", nameAr: "الساعد الأيمن (خلفي)", nameEn: "Right Forearm (Back)", view: "posterior", type: "path", path: "M 142 117 L 152 112 L 162 140 L 152 145 Z" },
  { id: "post-forearm-l", nameAr: "الساعد الأيسر (خلفي)", nameEn: "Left Forearm (Back)", view: "posterior", type: "path", path: "M 48 112 L 58 117 L 48 145 L 38 140 Z" },
  { id: "post-hand-r", nameAr: "اليد اليمنى (خلفي)", nameEn: "Right Hand (Back)", view: "posterior", type: "circle", cx: 166, cy: 147, r: 7 },
  { id: "post-hand-l", nameAr: "اليد اليسرى (خلفي)", nameEn: "Left Hand (Back)", view: "posterior", type: "circle", cx: 34, cy: 147, r: 7 },
  { id: "post-trunk", nameAr: "الجزع (خلفي)", nameEn: "Trunk (Back)", view: "posterior", type: "path", path: "M 75 70 L 125 70 L 120 135 L 80 135 Z" },
  { id: "post-pelvis", nameAr: "الحوض (خلفي)", nameEn: "Pelvis (Back)", view: "posterior", type: "path", path: "M 80 137 L 120 137 L 115 155 L 85 155 Z" },
  { id: "post-thigh-r", nameAr: "الفخذ الأيمن (خلفي)", nameEn: "Right Thigh (Back)", view: "posterior", type: "path", path: "M 102 157 L 125 157 L 130 195 L 108 200 Z" },
  { id: "post-thigh-l", nameAr: "الفخذ الأيسر (خلفي)", nameEn: "Left Thigh (Back)", view: "posterior", type: "path", path: "M 75 157 L 98 157 L 92 200 L 70 195 Z" },
  { id: "post-knee-r", nameAr: "الركبة اليمنى (خلفي)", nameEn: "Right Knee (Back)", view: "posterior", type: "circle", cx: 120, cy: 208, r: 8 },
  { id: "post-knee-l", nameAr: "الركبة اليسرى (خلفي)", nameEn: "Left Knee (Back)", view: "posterior", type: "circle", cx: 80, cy: 208, r: 8 },
  { id: "post-shin-r", nameAr: "الساق اليمنى (خلفي)", nameEn: "Right Shin (Back)", view: "posterior", type: "path", path: "M 114 216 L 126 216 L 128 260 L 118 260 Z" },
  { id: "post-shin-l", nameAr: "الساق اليسرى (خلفي)", nameEn: "Left Shin (Back)", view: "posterior", type: "path", path: "M 74 216 L 86 216 L 82 260 L 72 260 Z" },
  { id: "post-foot-r", nameAr: "القدم اليمنى (خلفي)", nameEn: "Right Foot (Back)", view: "posterior", type: "path", path: "M 118 262 L 130 262 L 135 275 L 116 275 Z" },
  { id: "post-foot-l", nameAr: "القدم اليسرى (خلفي)", nameEn: "Left Foot (Back)", view: "posterior", type: "path", path: "M 70 262 L 82 262 L 84 275 L 65 275 Z" },
];

interface BodyPainMapperProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  onRegionSelect?: (regionName: string) => void;
  onRegionDeselect?: (regionName: string) => void;
}

export default function BodyPainMapper({ selectedRegions, onChange, onRegionSelect, onRegionDeselect }: BodyPainMapperProps) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);

  const handleRegionClick = (region: BodyRegion) => {
    const isAlreadySelected = selectedRegions.includes(region.id);
    let newSelection: string[];
    
    if (isAlreadySelected) {
      newSelection = selectedRegions.filter(id => id !== region.id);
      if (onRegionDeselect) {
        const name = isRtl ? region.nameAr : region.nameEn;
        onRegionDeselect(name);
      }
    } else {
      newSelection = [...selectedRegions, region.id];
      if (onRegionSelect) {
        const name = isRtl ? region.nameAr : region.nameEn;
        onRegionSelect(name);
      }
    }
    onChange(newSelection);
  };

  const renderShape = (region: BodyRegion) => {
    const isSelected = selectedRegions.includes(region.id);
    const isHovered = hoveredRegion?.id === region.id;
    
    const fill = isSelected 
      ? "fill-rose-500/85 stroke-rose-700 stroke-[1.8] drop-shadow-[0_6px_10px_rgba(225,29,72,0.35)]" 
      : isHovered 
      ? "fill-rose-300/45 stroke-rose-500 stroke-[1.2] drop-shadow-[0_4px_8px_rgba(244,63,94,0.22)]" 
      : "fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700 stroke-[1]";

    const commonProps = {
      className: `${fill} transition-all duration-200 cursor-pointer origin-center hover:scale-[1.025] active:scale-95`,
      onClick: () => handleRegionClick(region),
      onMouseEnter: () => setHoveredRegion(region),
      onMouseLeave: () => setHoveredRegion(null),
    };

    if (region.type === "circle" && region.cx !== undefined && region.cy !== undefined && region.r !== undefined) {
      return <circle key={region.id} cx={region.cx} cy={region.cy} r={region.r} {...commonProps} />;
    }
    if (region.type === "rect" && region.x !== undefined && region.y !== undefined && region.width !== undefined && region.height !== undefined) {
      return <rect key={region.id} x={region.x} y={region.y} width={region.width} height={region.height} rx={2} {...commonProps} />;
    }
    if (region.type === "path" && region.path !== undefined) {
      return <path key={region.id} d={region.path} {...commonProps} />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 w-full [perspective:900px]">
      <div className="text-center mb-3">
        <h3 className="text-xs font-bold text-[#0d8a8a] uppercase tracking-wider">
          {isRtl ? "مخطط خريطة الألم العضلي التفاعلي" : "Interactive Muscle Pain Map"}
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {isRtl 
            ? "انقر لتحديد المنطقة المصابة وتعبئة حقل التشخيص تلقائياً" 
            : "Click to select affected areas to auto-fill notes"}
        </p>
      </div>

      <div className="flex justify-center gap-8 w-full max-w-md select-none [transform-style:preserve-3d]">
        {/* Anterior View */}
        <div className="flex flex-col items-center transition-transform duration-300 hover:[transform:rotateY(-8deg)_rotateX(4deg)_translateZ(10px)]">
          <span className="text-[10px] font-bold text-slate-400 mb-1">{isRtl ? "أمامي (Anterior)" : "Anterior (Front)"}</span>
          <svg width="180" height="290" viewBox="0 -10 200 290" className="drop-shadow-[0_18px_22px_rgba(15,23,42,0.12)]">
            {/* Outline body background shadow */}
            <path d="M 80 15 L 120 15 L 140 70 L 155 110 L 165 150 L 145 160 L 135 125 L 128 190 L 135 275 L 115 275 L 120 205 L 100 148 L 80 205 L 85 275 L 65 275 L 72 190 L 65 125 L 55 160 L 35 150 L 45 110 L 60 70 Z" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="6" strokeLinejoin="round" />
            {BODY_PAIN_REGIONS.filter(r => r.view === "anterior").map(renderShape)}
          </svg>
        </div>

        {/* Posterior View */}
        <div className="flex flex-col items-center transition-transform duration-300 hover:[transform:rotateY(8deg)_rotateX(4deg)_translateZ(10px)]">
          <span className="text-[10px] font-bold text-slate-400 mb-1">{isRtl ? "خلفي (Posterior)" : "Posterior (Back)"}</span>
          <svg width="180" height="290" viewBox="0 -10 200 290" className="drop-shadow-[0_18px_22px_rgba(15,23,42,0.12)]">
            <path d="M 80 15 L 120 15 L 140 70 L 155 110 L 165 150 L 145 160 L 135 125 L 128 190 L 135 275 L 115 275 L 120 205 L 100 148 L 80 205 L 85 275 L 65 275 L 72 190 L 65 125 L 55 160 L 35 150 L 45 110 L 60 70 Z" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="6" strokeLinejoin="round" />
            {BODY_PAIN_REGIONS.filter(r => r.view === "posterior").map(renderShape)}
          </svg>
        </div>
      </div>

      {/* Floating dynamic Muscle name preview */}
      <div className="mt-3 min-h-6 text-center">
        {hoveredRegion ? (
          <span className="text-xs font-bold text-[#0d8a8a] bg-teal-50 dark:bg-teal-950/20 px-2.5 py-1 rounded-full border border-teal-150">
            {isRtl ? hoveredRegion.nameAr : hoveredRegion.nameEn}
          </span>
        ) : selectedRegions.length > 0 ? (
          <span className="text-[10px] text-slate-400">
            {isRtl ? `${selectedRegions.length} منطقة محددة` : `${selectedRegions.length} regions selected`}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">-</span>
        )}
      </div>
    </div>
  );
}
