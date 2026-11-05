"use client";

import {
  Activity,
  Star,
  Zap,
  Building,
  Users,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

const centers = [
  { icon: Activity, name: "Elite Physio" },
  { icon: Star, name: "Motion Clinic" },
  { icon: Zap, name: "Recovery Hub" },
  { icon: Building, name: "Prime Rehab" },
  { icon: Users, name: "FlexCare" },
  { icon: BarChart3, name: "Physio One" },
  { icon: CheckCircle2, name: "Active Motion" },
  { icon: ShieldCheck, name: "Rehab Plus" },
  { icon: LayoutDashboard, name: "HealthCore" },
];

export default function TrustedStrip() {
  return (
    <section className="pp-capabilities" aria-label="المراكز">
      <div className="pp-wrap">
        <p className="pp-capabilities-title">موثوق من قبل أفضل المراكز</p>
        <div className="pp-capabilities-list" dir="ltr">
          {centers.map(({ icon: Icon, name }) => (
            <div className="pp-capability" key={name}>
              <Icon aria-hidden="true" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
