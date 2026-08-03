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

export const revalidate = 0; // Disable static rendering so content updates immediately

export default async function LandingPage() {
  const supabase = getAdminClient();
  const { data } = await supabase.from("platform_content").select("*");
  
  const contentMap: Record<string, any> = {};
  if (data) {
    data.forEach(row => {
      contentMap[row.key] = row.content;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#4F46E5] selection:text-white">
      {/* 2. Main Navigation */}
      <Navbar />

      <main className="flex-grow">
        {/* 3. Hero Section */}
        <Hero cmsContent={contentMap.hero} />

        {/* 4. Trusted By / Social Proof */}
        <TrustedStrip />

        {/* 5. Quick Stats */}
        <Stats />

        {/* 6. Why Prime Physio (Comparison) */}
        <ComparisonSection />

        {/* 6.5 Before/After Visual */}
        <BeforeAfter />

        {/* 7. Features Bento Grid */}
        <FeaturesBento />

        {/* 7.5. Detailed Features */}
        <FeaturesDetail />

        {/* 8. Interactive Dashboard Preview */}
        <DashboardInteractive />

        {/* 9. Workflow / Automations */}
        <WorkflowAutomations />

        {/* 10. Integrations */}
        <Integrations />

        {/* 11. Patient Journey */}
        <PatientJourney />

        {/* 12. Security & Compliance */}
        <Security />

        {/* 13. Testimonials */}
        <TestimonialsCarousel />

        {/* 14. Case Study */}
        <CaseStudy />

        {/* 15. Pricing */}
        <Pricing cmsContent={contentMap.pricing} />

        {/* 15.5 ROI Calculator */}
        <ROICalculator />

        {/* 16. FAQ */}
        <FAQ />
      </main>

      {/* 17. Footer */}
      <Footer />
    </div>
  );
}
