import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";
import Link from "next/link";
import { Activity, Calendar, ShieldCheck, Users, BarChart3, Stethoscope, ChevronLeft, ArrowLeft } from "lucide-react";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const admin = getAdminClient();
    const email = session.user.email.toLowerCase().trim();

    let targetPath = "";
    
    try {
      const { data: platformAdmin } = await admin
        .from("platform_admins")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (platformAdmin) {
        targetPath = "/admin";
      } else {
        const { data: staff } = await admin
          .from("staff")
          .select("clinic_id")
          .eq("email", email)
          .limit(1)
          .maybeSingle();

        if (!staff || !staff.clinic_id) {
          targetPath = "/setup";
        } else {
          const { data: branch } = await admin
            .from("branches")
            .select("id")
            .eq("clinic_id", staff.clinic_id)
            .limit(1)
            .maybeSingle();

          if (!branch) {
            targetPath = "/setup";
          } else {
            targetPath = "/home";
          }
        }
      }
    } catch (err) {
      console.error("RootPage Error:", err);
      targetPath = "/setup";
    }

    if (targetPath) {
      redirect(targetPath);
    }
  }

  // ==== LANDING PAGE FOR NON-LOGGED IN USERS ====
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-[#4F46BA] selection:text-white overflow-x-hidden" dir="rtl">
      {/* HEADER - Glassmorphism */}
      <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center text-white shadow-lg shadow-[#4F46BA]/20">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">Prime<span className="text-[#4F46BA]">Physio</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/manage" 
              className="px-5 py-2.5 rounded-full text-slate-700 font-bold hover:bg-slate-100 transition-colors text-sm"
            >
              تسجيل الدخول
            </Link>
            <Link 
              href="/manage" 
              className="hidden sm:flex px-6 py-2.5 rounded-full bg-[#4F46BA] text-white font-bold hover:bg-[#4338ca] hover:shadow-lg hover:shadow-[#4F46BA]/30 hover:-translate-y-0.5 transition-all text-sm items-center gap-2 group"
            >
              ابدأ مجاناً <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="pt-36 pb-20 px-6 relative overflow-hidden">
        {/* Abstract Animated Background */}
        <div className="absolute top-0 inset-x-0 h-screen overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-[#4F46BA]/15 blur-[120px] rounded-full mix-blend-multiply animate-pulse" />
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#7c3aed]/15 blur-[100px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDelay: "2s" }} />
          <div className="absolute -bottom-40 left-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-[#4F46BA]/20 text-[#4F46BA] text-sm font-bold shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ShieldCheck className="w-4 h-4" /> الخيار الأذكى لعيادات العلاج الطبيعي
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.15] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            إدارة عيادتك أصبحت <br className="hidden md:block"/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#4F46BA] to-[#7c3aed] relative inline-block">
              أكثر احترافية وسهولة
              {/* Swoosh Underline */}
              <svg className="absolute w-full h-4 -bottom-2 left-0 text-[#7c3aed]/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0 10 Q 50 0 100 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            نظام متكامل يجمع السجلات الطبية (EMR)، إدارة الحجوزات، الموارد البشرية، والتقارير في منصة سحابية واحدة مصممة خصيصاً لمراكز التأهيل.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              href="/manage" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#4F46BA] text-white font-bold text-lg hover:bg-[#4338ca] hover:shadow-xl hover:shadow-[#4F46BA]/25 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
            >
              أنشئ عيادتك الآن <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 font-bold text-lg hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-1 transition-all flex items-center justify-center"
            >
              استكشف المميزات
            </Link>
          </div>
        </div>

        {/* Floating Glass Image Container */}
        <div className="max-w-5xl mx-auto mt-20 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-transparent z-10 pointer-events-none translate-y-10" />
          
          <div className="relative z-0 rounded-[2.5rem] border border-white/60 bg-white/40 backdrop-blur-2xl p-2 md:p-3 shadow-2xl shadow-[#4F46BA]/10 ring-1 ring-slate-900/5 transition-transform duration-700 group-hover:scale-[1.01]">
            <div className="rounded-[2rem] overflow-hidden border border-white/50 relative bg-slate-100 aspect-[16/9] sm:aspect-[21/9]">
              <img src="/landing-hero.png" alt="Prime Physio Clinic" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#4F46BA]/20 to-transparent mix-blend-multiply" />
            </div>

            {/* Floating Glass Card 1 */}
            <div className="absolute -left-8 top-1/4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white animate-in fade-in slide-in-from-right-8 duration-700 delay-700 hidden md:flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold">مرضى نشطين</p>
                <p className="text-xl font-black text-slate-800 tracking-tight">+2,400</p>
              </div>
            </div>

            {/* Floating Glass Card 2 */}
            <div className="absolute -right-8 bottom-1/4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white animate-in fade-in slide-in-from-left-8 duration-700 delay-1000 hidden md:flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold">جلسات مكتملة</p>
                <p className="text-xl font-black text-slate-800 tracking-tight">+15,000</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BENTO FEATURES SECTION */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">قوة الأداء في تصميم بسيط</h2>
            <p className="text-lg text-slate-500 font-medium">كل الأدوات التي تحتاجها لإدارة العيادة الحديثة مجموعة في واجهة واحدة سلسة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* EMR - Large Horizontal */}
            <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#4F46BA]/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -z-10 group-hover:bg-indigo-100 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4F46BA] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">السجلات الطبية (EMR)</h3>
              <p className="text-slate-600 font-medium leading-relaxed max-w-md">
                ملفات إلكترونية مفصلة للتقييمات الحركية، الاختبارات الخاصة، وخطط العلاج، تغنيك عن الورق تماماً وتحمي بيانات مرضاك.
              </p>
            </div>

            {/* Calendar - Vertical */}
            <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#4F46BA]/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full blur-[60px] -z-10 group-hover:bg-purple-100 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">الحجوزات</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                تقويم ذكي وسلس لإدارة المواعيد وتوزيع المهام على الأطباء.
              </p>
            </div>

            {/* HR / Permissions */}
            <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#4F46BA]/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-50 rounded-full blur-[60px] -z-10 group-hover:bg-emerald-100 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">صلاحيات الطاقم</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                تحكم دقيق بصلاحيات السكرتارية والأطباء والمحاسبين.
              </p>
            </div>

            {/* Analytics - Large Horizontal */}
            <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl hover:shadow-[#4F46BA]/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group text-white">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4F46BA]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-6 backdrop-blur-md group-hover:scale-110 transition-transform relative z-10">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 relative z-10">إحصائيات وماليات متقدمة</h3>
              <p className="text-slate-400 font-medium leading-relaxed max-w-md relative z-10">
                لوحة تحكم إحصائية حية تراقب الإيرادات، المدفوعات، نمو العيادة، ومعدل أداء الأطباء بدقة لاتخاذ قرارات أذكى.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-24 relative overflow-hidden m-6 mb-12 rounded-[3rem] bg-slate-950 border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46BA]/40 via-slate-950 to-[#7c3aed]/20" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
            مستعد لنقل عيادتك إلى <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">المستوى التالي؟</span>
          </h2>
          <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
            انضم إلى العيادات الرائدة التي تستخدم Prime Physio يومياً لإدارة عملياتها الطبية بفاعلية وبدون عناء.
          </p>
          <div className="pt-8">
            <Link 
              href="/manage" 
              className="inline-flex px-12 py-5 rounded-full bg-white text-[#4F46BA] font-black text-lg hover:bg-indigo-50 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all items-center gap-3 group"
            >
              ابدأ الآن - مجاناً <ArrowLeft className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-transparent py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200/60 pt-8">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
            <Activity className="w-5 h-5 text-[#4F46BA]" />
            <span className="font-black text-lg text-slate-800 tracking-tight">Prime<span className="text-[#4F46BA]">Physio</span></span>
          </div>
          <p className="text-slate-500 text-sm font-bold">
            &copy; {new Date().getFullYear()} Prime Physio. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
