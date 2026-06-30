"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      
      const sections = ["why-us", "features", "pricing", "faq"];
      let current = "";

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Adjust threshold based on header height
          if (rect.top <= 150) {
            current = section;
          }
        }
      }
      
      // If we're near top, activate home
      if (window.scrollY < 100) {
        current = "";
      }
      
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "الرئيسية", href: "#", id: "" },
    { name: "لماذا نحن", href: "#why-us", id: "why-us" },
    { name: "المميزات", href: "#features", id: "features" },
    { name: "الأسعار", href: "#pricing", id: "pricing" },
    { name: "الأسئلة الشائعة", href: "#faq", id: "faq" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm"
          : "bg-transparent border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-2 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">
              Prime<span className="text-[#4F46E5]">Physio</span>
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-bold leading-6 transition-colors relative group py-2 px-1 ${
                activeSection === link.id ? "text-[#4F46E5]" : "text-slate-600 hover:text-[#4F46E5]"
              }`}
            >
              {link.name}
              {activeSection === link.id && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute -bottom-1 right-0 w-full h-0.5 bg-[#4F46E5] rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {activeSection !== link.id && (
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-[#4F46E5] transition-all duration-300 group-hover:w-full rounded-full"></span>
              )}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4 items-center">
          <Link
            href="/manage"
            className="text-sm font-bold leading-6 text-slate-700 hover:text-[#4F46E5] transition-colors"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 z-50 bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-slate-900/10"
          >
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-2 rounded-xl text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="font-bold text-xl text-slate-900">PrimePhysio</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-slate-500/10">
                <div className="space-y-2 py-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50 hover:text-[#4F46E5]"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6 flex flex-col gap-3">
                  <Link
                    href="/manage"
                    onClick={() => setMobileMenuOpen(false)}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50 text-center border border-slate-200"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338ca] hover:to-[#6d28d9] text-center shadow-md"
                  >
                    ابدأ مجانًا
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
