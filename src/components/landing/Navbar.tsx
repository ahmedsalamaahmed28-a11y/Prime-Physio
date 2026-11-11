"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Menu, X, LayoutDashboard, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";

const navLinks = [
  { name: "الرئيسية", href: "#top", id: "top" },
  { name: "المميزات", href: "#features", id: "features" },
  { name: "كيف يعمل", href: "#how", id: "how" },
  { name: "الأسعار", href: "#pricing", id: "pricing" },
  { name: "الأسئلة الشائعة", href: "#faq", id: "faq" },
  { name: "الدعم", href: "#contact", id: "contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const { user } = useAuth();
  const { language, toggleLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
      const marker = window.scrollY + 150;
      let active = "top";
      for (const item of navLinks) {
        const section = document.getElementById(item.id);
        if (section && section.offsetTop <= marker) active = item.id;
      }
      setActiveSection(active);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("pp-menu-open", mobileMenuOpen);
    return () => document.body.classList.remove("pp-menu-open");
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.documentElement.lang = language === "ar" ? "ar" : "en";
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header id="top" className={`pp-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="pp-wrap pp-header-inner">
        <Link href="/" className="pp-brand" aria-label="Prime Physio">
          <span className="pp-brand-mark"><Activity aria-hidden="true" /></span>
          <span>Prime<span className="pp-brand-accent">Physio</span></span>
        </Link>

        <button
          type="button"
          className="pp-menu-toggle"
          aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={mobileMenuOpen}
          aria-controls="pp-main-nav"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

        <nav id="pp-main-nav" className={`pp-nav ${mobileMenuOpen ? "is-open" : ""}`} aria-label="التنقل الرئيسي">
          {navLinks.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={closeMenu}
              aria-current={activeSection === item.id ? "location" : undefined}
              className={activeSection === item.id ? "is-active" : ""}
            >
              {item.name}
            </Link>
          ))}

          <span className="pp-nav-divider" aria-hidden="true" />

          <button type="button" className="pp-language" onClick={() => { toggleLanguage(); closeMenu(); }}>
            <Globe aria-hidden="true" />
            {language === "ar" ? "English" : "العربية"}
          </button>

          {user ? (
            <Link
              href={user?.roleKey === "platform_admin" ? "/platform" : "/dashboard"}
              className="pp-button pp-button-primary pp-nav-cta"
              onClick={closeMenu}
            >
              <LayoutDashboard aria-hidden="true" />
              لوحة التحكم
            </Link>
          ) : (
            <>
              <Link href="/login.php/" className="pp-login-link" onClick={closeMenu}>دخول المالك</Link>
              <a href="/rgstr.php" className="pp-button pp-button-primary pp-nav-cta" onClick={closeMenu}>أنشئ مركزك</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
