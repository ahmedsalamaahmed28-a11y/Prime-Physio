"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Activity, CalendarDays, Users, ClipboardList, CreditCard,
  Check, ArrowLeft, ArrowRight, Clock, Bell, TrendingUp
} from "lucide-react";

export default function Hero({ cmsContent }: { cmsContent?: any }) {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  // Use the CMS copy in Arabic. English is rendered directly here so the
  // hero never depends on the DOM translation observer.
  const badgeText = isEnglish
    ? "All-in-One Management for Physiotherapy Clinics"
    : cmsContent?.badgeText || "منصة متكاملة لإدارة مراكز العلاج الطبيعي";
  const titlePart1 = isEnglish ? "Manage Your Clinic" : cmsContent?.titlePart1 || "إدارة مركزك الطبي";
  const titlePart2 = isEnglish ? "with Ease and Confidence" : cmsContent?.titlePart2 || "بكل سهولة واحترافية";
  const description = isEnglish
    ? "Manage patients, treatment sessions, appointments, therapists, medical records, invoices, and financial reports—all in one place. Keep your clinic organized and make better decisions with a clear, easy-to-use system."
    : cmsContent?.description || "نظّم ملفات المرضى والجلسات والمواعيد والفريق والحسابات من مكان واحد. تجربة عربية واضحة تساعدك على متابعة تفاصيل مركزك واتخاذ قرارات أفضل.";
  const primaryButtonText = isEnglish ? "Create Your Clinic" : "أنشئ مركزك";
  const secondaryButtonText = isEnglish ? "Explore Features" : cmsContent?.secondaryButtonText || "اكتشف المميزات";
  const ownerLoginText = isEnglish ? "Owner Login" : "دخول المالك";
  const feature1 = isEnglish ? "Complete patient and session management" : cmsContent?.feature1 || "إدارة متكاملة للمرضى والجلسات";
  const feature2 = isEnglish ? "Organized medical records and billing" : cmsContent?.feature2 || "ملفات طبية وفواتير منظمة";
  const feature3 = isEnglish ? "Access your clinic from any device" : cmsContent?.feature3 || "متاح من أي جهاز";
  const DirectionArrow = isEnglish ? ArrowRight : ArrowLeft;

  return (
    <section className="pp-hero" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="pp-hero-glow pp-hero-glow-one" aria-hidden="true" />
      <div className="pp-hero-glow pp-hero-glow-two" aria-hidden="true" />
      <div className="pp-wrap pp-hero-grid">
        <div data-csp-motion="reveal" className="pp-hero-copy">
          <p className="pp-eyebrow"><span className="pp-status-dot" />{badgeText}</p>
          <h1>{titlePart1} <em>{titlePart2}</em></h1>
          <p className="pp-hero-lead">{description}</p>

          <div className="pp-hero-actions">
            <a href="/rgstr.php" className="pp-button pp-button-primary pp-button-large">
              {primaryButtonText}<DirectionArrow aria-hidden="true" />
            </a>
            <Link href="/login.php/" className="pp-button pp-button-outline pp-button-large">
              {ownerLoginText}
            </Link>
          </div>

          <ul className="pp-hero-points">
            {[feature1, feature2, feature3].map((feature) => (
              <li key={feature}><Check aria-hidden="true" />{feature}</li>
            ))}
          </ul>
        </div>

        <div data-csp-motion="reveal"
          className="pp-hero-visual"
          aria-label={isEnglish ? "Prime Physio dashboard preview" : "معاينة توضيحية للوحة تحكم Prime Physio"}
          dir={isEnglish ? "ltr" : "rtl"}
        >
          <div className="pp-dashboard-window">
            <div className="pp-window-bar">
              <span /><span /><span />
              <div>primephysio.app / dashboard</div>
            </div>
            <div className="pp-dashboard-body">
              <div className="pp-dashboard-welcome">
                <div>
                  <small>{isEnglish ? "Clinic Overview" : "لوحة متابعة المركز"}</small>
                  <strong>{isEnglish ? "Welcome to Prime Physio" : "مرحباً بك في Prime Physio"}</strong>
                </div>
                <span className="pp-dashboard-avatar"><Activity /></span>
              </div>
              <div className="pp-kpi-grid">
                <div className="pp-kpi">
                  <span className="pp-kpi-icon blue"><Users /></span>
                  <small>{isEnglish ? "Patient Records" : "ملفات المرضى"}</small>
                  <b>{isEnglish ? "Well Organized" : "إدارة منظمة"}</b>
                  <em>{isEnglish ? "Easy Tracking" : "متابعة سهلة"}</em>
                </div>
                <div className="pp-kpi">
                  <span className="pp-kpi-icon yellow"><CalendarDays /></span>
                  <small>{isEnglish ? "Sessions & Appointments" : "الجلسات والمواعيد"}</small>
                  <b>{isEnglish ? "Clear Schedule" : "جدول واضح"}</b>
                  <em>{isEnglish ? "Plan Your Day" : "تنظيم يومك"}</em>
                </div>
                <div className="pp-kpi">
                  <span className="pp-kpi-icon green"><CreditCard /></span>
                  <small>{isEnglish ? "Billing & Finance" : "الحسابات"}</small>
                  <b>{isEnglish ? "Financial Tracking" : "متابعة مالية"}</b>
                  <em>{isEnglish ? "Accurate Reports" : "تقارير دقيقة"}</em>
                </div>
              </div>
              <div className="pp-dashboard-panels">
                <div className="pp-preview-panel">
                  <div className="pp-panel-heading">
                    <b>{isEnglish ? "Session Schedule" : "جدول الجلسات"}</b>
                    <span>{isEnglish ? "Today" : "اليوم"}</span>
                  </div>
                  {[
                    ["09:00", isEnglish ? "Patient Follow-up" : "متابعة حالة", isEnglish ? "Completed" : "مكتملة", "done"],
                    ["10:30", isEnglish ? "Physiotherapy Session" : "جلسة علاج طبيعي", isEnglish ? "In Progress" : "جارية", "active"],
                    ["12:00", isEnglish ? "Initial Assessment" : "تقييم أولي", isEnglish ? "Upcoming" : "قادمة", "upcoming"],
                  ].map((item) => (
                    <div className="pp-appointment" key={item[0]}>
                      <time>{item[0]}</time><span className="pp-appointment-name">{item[1]}</span>
                      <small className={item[3]}>{item[2]}</small>
                    </div>
                  ))}
                </div>
                <div className="pp-preview-panel pp-team-panel">
                  <div className="pp-panel-heading">
                    <b>{isEnglish ? "Clinic Management" : "إدارة المركز"}</b>
                    <span><TrendingUp /></span>
                  </div>
                  <div className="pp-team-item"><span className="pp-team-icon"><ClipboardList /></span><span>{isEnglish ? "Medical Records" : "الملفات الطبية"}</span><Check /></div>
                  <div className="pp-team-item"><span className="pp-team-icon"><Users /></span><span>{isEnglish ? "Doctors & Staff" : "الأطباء وفريق العمل"}</span><Check /></div>
                  <div className="pp-team-item"><span className="pp-team-icon"><Bell /></span><span>{isEnglish ? "Notifications" : "التنبيهات"}</span><Check /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="pp-floating-note">
            <span><Check /></span>
            <div>
              <b>{isEnglish ? "Everything in One Place" : "كل التفاصيل في مكان واحد"}</b>
              <small>{isEnglish ? "A clearer way to manage your clinic" : "إدارة أكثر وضوحاً لمركزك"}</small>
            </div>
          </div>
          <div className="pp-floating-clock"><Clock /><span>{isEnglish ? "Make Every Minute Count" : "وقتك أكثر تنظيماً"}</span></div>
        </div>
      </div>
    </section>
  );
}
