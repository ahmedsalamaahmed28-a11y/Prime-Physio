import "./landing.css";
import { getAdminClient } from "@/lib/supabase";
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
import HowItWorks from "@/components/landing/HowItWorks";
import TestimonialsCarousel from "@/components/landing/TestimonialsCarousel";
import CaseStudy from "@/components/landing/CaseStudy";
import Pricing from "@/components/landing/Pricing";
import ROICalculator from "@/components/landing/ROICalculator";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import BeforeAfter from "@/components/landing/BeforeAfter";
import PatientJourney from "@/components/landing/PatientJourney";
export const revalidate = 0;
export default async function LandingPage() {
  const contentMap: Record<string, any> = {};
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.from("platform_content").select("*");
    if (error) {
      console.error("Landing CMS content could not be loaded:", error.message);
    } else if (data) {
      data.forEach((row) => { contentMap[row.key] = row.content; });
    }
  } catch (error) {
    // Public landing page remains available with safe defaults when preview
    // environments intentionally do not contain the service-role key.
    console.warn("Landing CMS is unavailable; rendering default content.", error);
  }
  return <div id="top" className="pp-landing min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-grow">
      <Hero cmsContent={contentMap.hero} />
      <Stats />
      <TrustedStrip />
      <FeaturesBento />
      <ComparisonSection />
      <BeforeAfter />
      <FeaturesDetail />
      <DashboardInteractive />
      <WorkflowAutomations />
      <Integrations />
      <PatientJourney />
      <section id="how" className="pp-section-anchor"><HowItWorks /></section>
      <Security />
      <TestimonialsCarousel />
      <CaseStudy />
      <Pricing cmsContent={contentMap.pricing} />
      <ROICalculator />
      <FAQ />
      <section className="pp-final-cta"><div className="pp-wrap pp-final-cta-inner">
        <div><h2>ابدأ بتنظيم مركزك مع Prime Physio</h2><p>اجمع إدارة المرضى والجلسات والفريق والحسابات في مكان واحد.</p></div>
        <div className="pp-final-actions"><a href="/signup" className="pp-button pp-button-accent">أنشئ حسابك</a><a href="/manage" className="pp-button pp-button-light-outline">تسجيل الدخول</a></div>
      </div></section>
    </main>
    <div id="contact"><Footer /></div>
  </div>;
}