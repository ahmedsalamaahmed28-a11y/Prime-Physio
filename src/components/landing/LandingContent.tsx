"use client";

import { useLanguage } from "@/lib/LanguageContext";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustedStrip from "@/components/landing/TrustedStrip";
import FeaturesBento from "@/components/landing/FeaturesBento";
import FeaturesDetail from "@/components/landing/FeaturesDetail";
import ComparisonSection from "@/components/landing/ComparisonSection";
import DashboardInteractive from "@/components/landing/DashboardInteractive";
import Stats from "@/components/landing/Stats";
import Integrations from "@/components/landing/Integrations";
import WorkflowAutomations from "@/components/landing/WorkflowAutomations";
import Security from "@/components/landing/Security";
import TestimonialsCarousel from "@/components/landing/TestimonialsCarousel";
import CaseStudy from "@/components/landing/CaseStudy";
import Pricing from "@/components/landing/Pricing";
import ROICalculator from "@/components/landing/ROICalculator";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import BeforeAfter from "@/components/landing/BeforeAfter";
import PatientJourney from "@/components/landing/PatientJourney";

type Props = { contentMap: Record<string, any> };

function EnglishLanding() {
  const features = [
    ["Patient records", "Keep patient profiles, clinical notes and treatment history organized in one place."],
    ["Appointments & sessions", "Plan schedules, follow visits and keep your team aligned throughout the day."],
    ["Billing & subscriptions", "Track invoices, payments and clinic subscription details from one workspace."],
    ["Clinical resources", "Give your team quick access to rehabilitation protocols and clinical references."],
    ["Reports & insights", "Review clinic activity and performance with clear operational reports."],
    ["Team management", "Manage staff access and day-to-day clinic operations with role-aware tools."]
  ];
  const steps = [
    ["01", "Create your clinic", "Set up your clinic profile and invite the people who work with you."],
    ["02", "Organize your workflow", "Add patients, arrange appointments and manage clinical records."],
    ["03", "Follow your progress", "Use reports and daily views to understand your clinic activity."]
  ];
  const faqs = [
    ["What is Prime Physio?", "Prime Physio is a clinic management platform designed for physical therapy and rehabilitation centers."],
    ["Can my team use the system?", "Yes. You can organize access for your clinic team according to the roles and permissions available in your account."],
    ["Can I explore the platform before subscribing?", "Visit the plans page to review the available plan and subscription options."],
    ["How can I get support?", "Open the Support page to find the available contact channels."]
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" dir="ltr">
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl text-center">
            <span className="inline-flex rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold text-indigo-700">Clinic management for physical therapy</span>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl">A clearer way to manage your <span className="text-indigo-600">physical therapy clinic</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">Bring patient records, appointments, sessions, billing and clinic operations together in one organized workspace.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a href="/signup" className="rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Get started</a>
              <a href="/plans" className="rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">Explore plans</a>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">One connected workspace</p><h2 className="mt-3 text-3xl font-extrabold text-slate-900">Everything your clinic needs to stay organized</h2><p className="mt-4 text-sm leading-7 text-slate-500">Spend less time switching between tools and more time focusing on your patients and team.</p></div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, desc]) => <article key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg font-black text-indigo-600">✓</div><h3 className="text-base font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p></article>)}
          </div>
        </section>
        <section className="bg-slate-900 px-5 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">A simple workflow</p><h2 className="mt-3 text-3xl font-extrabold">Get your clinic moving in three steps</h2></div><div className="mt-10 grid gap-8 md:grid-cols-3">{steps.map(([num,title,desc])=><div key={num} className="border-t border-white/20 pt-5"><span className="text-sm font-black text-indigo-300">{num}</span><h3 className="mt-3 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-300">{desc}</p></div>)}</div></div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20"><div className="grid gap-10 md:grid-cols-2 md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Built around your clinic</p><h2 className="mt-3 text-3xl font-extrabold text-slate-900">Keep your operations connected</h2><p className="mt-4 text-sm leading-8 text-slate-600">From the first patient record to daily appointments and financial follow-up, Prime Physio helps your team work with a more consistent process.</p><a href="/about" className="mt-6 inline-flex font-bold text-indigo-600 hover:text-indigo-800">Learn more about Prime Physio →</a></div><div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 shadow-xl"><div className="rounded-2xl bg-white/10 p-6 backdrop-blur"><p className="text-sm font-semibold text-indigo-100">Your clinic workspace</p><div className="mt-5 grid grid-cols-2 gap-3">{["Patients","Appointments","Clinical notes","Reports"].map(x=><div key={x} className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-bold">{x}</div>)}</div></div></div></div></section>
        <section className="bg-indigo-50 px-5 py-16 sm:py-20"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Plans & subscriptions</p><h2 className="mt-3 text-3xl font-extrabold text-slate-900">Choose a plan that fits your clinic</h2><p className="mt-4 text-sm leading-7 text-slate-600">Compare the available options and find the right starting point for your team.</p><a href="/plans" className="mt-7 inline-flex rounded-full bg-indigo-600 px-7 py-3 font-bold text-white hover:bg-indigo-700">View all plans</a></div></section>
        <section className="mx-auto max-w-4xl px-5 py-16 sm:py-20"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">FAQ</p><h2 className="mt-3 text-3xl font-extrabold text-slate-900">Frequently asked questions</h2></div><div className="mt-8 space-y-3">{faqs.map(([q,a])=><details key={q} className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-slate-800">{q}</summary><p className="mt-3 text-sm leading-7 text-slate-600">{a}</p></details>)}</div></section>
      </main>
      <footer className="bg-slate-950 px-5 py-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} Prime Physio. All rights reserved. <span className="mx-2">|</span><a href="/support" className="hover:text-white">Support</a><span className="mx-2">|</span><a href="/about" className="hover:text-white">About</a></footer>
    </div>
  );
}

export default function LandingContent({ contentMap }: Props) {
  const { language } = useLanguage();
  if (language === "en") return <EnglishLanding />;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#4F46E5] selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <Hero cmsContent={contentMap.hero} />
        <TrustedStrip /><Stats /><ComparisonSection /><BeforeAfter /><FeaturesBento /><FeaturesDetail />
        <DashboardInteractive /><WorkflowAutomations /><Integrations /><PatientJourney /><Security />
        <TestimonialsCarousel /><CaseStudy /><Pricing cmsContent={contentMap.pricing} /><ROICalculator /><FAQ />
      </main>
      <Footer />
    </div>
  );
}
