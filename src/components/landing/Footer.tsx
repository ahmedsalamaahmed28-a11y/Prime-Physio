"use client";

import Link from "next/link";
import { Activity, ArrowUp, Mail, MapPin, ShieldCheck, Stethoscope } from "lucide-react";

const footerGroups = [
  {
    title: "استكشف Prime Physio",
    links: [
      { label: "المميزات", href: "#features" },
      { label: "كيف يعمل النظام؟", href: "#how" },
      { label: "الباقات والأسعار", href: "#pricing" },
      { label: "الأسئلة الشائعة", href: "#faq" },
    ],
  },
  {
    title: "للمراكز والعيادات",
    links: [
      { label: "إنشاء حساب جديد", href: "/signup" },
      { label: "تسجيل الدخول", href: "/manage" },
      { label: "لوحة التحكم", href: "/manage" },
      { label: "تواصل مع فريقنا", href: "mailto:support@primephysio.app" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="pp-footer" dir="rtl">
      <div className="pp-footer-main pp-wrap">
        <div className="pp-footer-brand">
          <Link href="/" className="pp-footer-logo" aria-label="Prime Physio - الصفحة الرئيسية">
            <span className="pp-footer-logo-mark"><Activity aria-hidden="true" /></span>
            <span>Prime<span>Physio</span></span>
          </Link>
          <p>
            منصتك الذكية لإدارة مراكز وعيادات العلاج الطبيعي؛ نظّم المرضى والجلسات
            والفريق والحسابات من مكان واحد، وامنح مركزك تجربة إدارة أكثر سهولة واحترافية.
          </p>
          <div className="pp-footer-trust">
            <ShieldCheck aria-hidden="true" />
            <span>إدارة منظمة وبيانات محمية</span>
          </div>
        </div>

        {footerGroups.map((group) => (
          <nav className="pp-footer-links" aria-label={group.title} key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href}>{link.label}</a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="pp-footer-contact">
          <h3>يسعدنا تواصلك</h3>
          <p>هل لديك سؤال أو تحتاج إلى مساعدة؟ فريقنا هنا لمساعدتك.</p>
          <a className="pp-footer-contact-link" href="mailto:support@primephysio.app">
            <Mail aria-hidden="true" />
            <span>support@primephysio.app</span>
          </a>
          <div className="pp-footer-specialty">
            <Stethoscope aria-hidden="true" />
            <span>مصمم لمجتمع العلاج الطبيعي</span>
          </div>
        </div>
      </div>

      <div className="pp-footer-bottom">
        <div className="pp-wrap pp-footer-bottom-inner">
          <p>© {new Date().getFullYear()} Prime Physio. جميع الحقوق محفوظة.</p>
          <p className="pp-footer-made">حلول تقنية ترتقي بإدارة العلاج الطبيعي</p>
          <a className="pp-footer-top" href="#top" aria-label="العودة إلى أعلى الصفحة">
            <span>العودة للأعلى</span>
            <ArrowUp aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
