"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity, CalendarDays, Users, ClipboardList, CreditCard,
  Check, ArrowLeft, Clock3, Bell, TrendingUp
} from "lucide-react";

export default function Hero({ cmsContent }: { cmsContent?: any }) {
  const badgeText = cmsContent?.badgeText || "منصة متكاملة لإدارة مراكز العلاج الطبيعي";
  const titlePart1 = cmsContent?.titlePart1 || "إدارة مركزك الطبي";
  const titlePart2 = cmsContent?.titlePart2 || "بكل سهولة واحترافية";
  const description = cmsContent?.description || "نظّم ملفات المرضى والجلسات والمواعيد والفريق والحسابات من مكان واحد. تجربة عربية واضحة تساعدك على متابعة تفاصيل مركزك واتخاذ قرارات أفضل.";
  const primaryButtonText = cmsContent?.primaryButtonText || "ابدأ الآن";
  const secondaryButtonText = cmsContent?.secondaryButtonText || "اكتشف المميزات";
  const feature1 = cmsContent?.feature1 || "إدارة متكاملة للمرضى والجلسات";
  const feature2 = cmsContent?.feature2 || "صلاحيات واضحة لفريق العمل";
  const feature3 = cmsContent?.feature3 || "متاح من أي جهاز";

  return (
    <section className="pp-hero">
      <div className="pp-hero-glow pp-hero-glow-one" aria-hidden="true" />
      <div className="pp-hero-glow pp-hero-glow-two" aria-hidden="true" />
      <div className="pp-wrap pp-hero-grid">
        <motion.div
          className="pp-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="pp-eyebrow"><span className="pp-status-dot" />{badgeText}</p>
          <h1>{titlePart1} <em>{titlePart2}</em></h1>
          <p className="pp-hero-lead">{description}</p>

          <div className="pp-hero-actions">
            <Link href="/signup" className="pp-button pp-button-primary pp-button-large">
              {primaryButtonText}<ArrowLeft aria-hidden="true" />
            </Link>
            <Link href="#features" className="pp-button pp-button-outline pp-button-large">
              {secondaryButtonText}
            </Link>
          </div>

          <ul className="pp-hero-points">
            {[feature1, feature2, feature3].map((feature) => (
              <li key={feature}><Check aria-hidden="true" />{feature}</li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="pp-hero-visual"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          aria-label="معاينة توضيحية للوحة تحكم Prime Physio"
        >
          <div className="pp-dashboard-window">
            <div className="pp-window-bar">
              <span /><span /><span />
              <div>primephysio.app / dashboard</div>
            </div>
            <div className="pp-dashboard-body">
              <div className="pp-dashboard-welcome">
                <div><small>لوحة متابعة المركز</small><strong>مرحباً بك في Prime Physio</strong></div>
                <span className="pp-dashboard-avatar"><Activity /></span>
              </div>
              <div className="pp-kpi-grid">
                <div className="pp-kpi"><span className="pp-kpi-icon blue"><Users /></span><small>ملفات المرضى</small><b>إدارة منظمة</b><em>متابعة سهلة</em></div>
                <div className="pp-kpi"><span className="pp-kpi-icon yellow"><CalendarDays /></span><small>الجلسات والمواعيد</small><b>جدول واضح</b><em>تنظيم يومك</em></div>
                <div className="pp-kpi"><span className="pp-kpi-icon green"><CreditCard /></span><small>الحسابات</small><b>متابعة مالية</b><em>تقارير دقيقة</em></div>
              </div>
              <div className="pp-dashboard-panels">
                <div className="pp-preview-panel">
                  <div className="pp-panel-heading"><b>جدول الجلسات</b><span>اليوم</span></div>
                  {[
                    ["09:00", "متابعة حالة", "مكتملة", "done"],
                    ["10:30", "جلسة علاج طبيعي", "جارية", "active"],
                    ["12:00", "تقييم أولي", "قادمة", "upcoming"],
                  ].map((item) => (
                    <div className="pp-appointment" key={item[0]}>
                      <time>{item[0]}</time><span className="pp-appointment-name">{item[1]}</span>
                      <small className={item[3]}>{item[2]}</small>
                    </div>
                  ))}
                </div>
                <div className="pp-preview-panel pp-team-panel">
                  <div className="pp-panel-heading"><b>إدارة المركز</b><span><TrendingUp /></span></div>
                  <div className="pp-team-item"><span className="pp-team-icon"><ClipboardList /></span><span>الملفات الطبية</span><Check /></div>
                  <div className="pp-team-item"><span className="pp-team-icon"><Users /></span><span>فريق العمل</span><Check /></div>
                  <div className="pp-team-item"><span className="pp-team-icon"><Bell /></span><span>التنبيهات</span><Check /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="pp-floating-note"><span><Check /></span><div><b>كل التفاصيل في مكان واحد</b><small>إدارة أكثر وضوحاً لمركزك</small></div></div>
          <div className="pp-floating-clock"><Clock3 /><span>وقتك أكثر تنظيماً</span></div>
        </motion.div>
      </div>
    </section>
  );
}
