"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function FinalCTA() {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  return (
    <section className="pp-final-cta" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="pp-wrap pp-final-cta-inner">
        <div>
          <h2>{isEnglish ? "Start organizing your clinic with Prime Physio" : "ابدأ بتنظيم مركزك مع Prime Physio"}</h2>
          <p>{isEnglish
            ? "Bring patient records, sessions, team workflows, and clinic information together in one place."
            : "اجمع إدارة المرضى والجلسات والفريق ومعلومات المركز في مكان واحد."}</p>
        </div>
        <div className="pp-final-actions">
          <Link href="/rgstr.php" className="pp-button pp-button-accent">{isEnglish ? "Create your clinic" : "أنشئ مركزك"}</Link>
          <Link href="/login.php" className="pp-button pp-button-light-outline">{isEnglish ? "Owner login" : "دخول المالك"}</Link>
        </div>
      </div>
    </section>
  );
}
