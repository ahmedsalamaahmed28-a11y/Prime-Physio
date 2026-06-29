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
    <div className="min-h-screen bg-[#0B0F19] font-sans selection:bg-purple-500/30 selection:text-white overflow-x-hidden" dir="rtl">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0B0F19]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">Prime<span className="text-purple-400">Physio</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/manage" 
              className="px-5 py-2.5 rounded-full text-slate-300 font-bold hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              تسجيل الدخول
            </Link>
            <Link 
              href="/manage" 
              className="hidden sm:flex px-6 py-2.5 rounded-full bg-white text-[#0B0F19] font-black hover:bg-slate-200 hover:scale-105 transition-all text-sm items-center gap-2"
            >
              ابدأ مجاناً <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 pt-40 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-purple-300 text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            النظام السحابي الأول لإدارة عيادات التأهيل
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            المستقبل هنا. <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              أدر عيادتك بذكاء.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            تخلّص من السجلات الورقية تماماً. نظام إكلينيكي متكامل صُنع خصيصاً لأطباء العلاج الطبيعي والتأهيل الحركي، بلمسة من المستقبل.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link 
              href="/manage" 
              className="w-full sm:w-auto px-10 py-5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-3 group"
            >
              أنشئ عيادتك الآن <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
            </Link>
            <Link 
              href="#features" 
              className="w-full sm:w-auto px-10 py-5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center"
            >
              استكشف قوة المنصة
            </Link>
          </div>
        </div>

        {/* 3D Dashboard Mockup */}
        <div className="max-w-6xl mx-auto mt-24 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-20 pointer-events-none translate-y-20" />
          
          <div className="relative z-10 rounded-t-[2.5rem] border border-white/10 bg-[#151b2b] p-3 md:p-4 shadow-[0_-20px_80px_rgba(124,58,237,0.15)] ring-1 ring-white/5 transform-gpu rotate-x-12 scale-95 hover:rotate-x-0 hover:scale-100 transition-all duration-700 ease-out origin-bottom">
            <div className="absolute top-4 left-6 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="rounded-[1.5rem] overflow-hidden mt-6 bg-[#0B0F19] border border-white/5 relative aspect-[16/9]">
              <img src="/landing-hero.png" alt="Prime Physio Dashboard" className="w-full h-full object-cover object-center opacity-70 mix-blend-screen" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent" />
            </div>
          </div>
        </div>
      </main>

      {/* NEON FEATURES GRID */}
      <section id="features" className="py-32 relative z-10 border-t border-white/5 bg-[#0B0F19]/50 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
              أدوات <span className="text-purple-400">خارقة</span> بين يديك
            </h2>
            <p className="text-xl text-slate-400 font-medium">كل ما تحتاجه لإدارة العيادة في بيئة سحابية فائقة السرعة والأمان.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature: EMR */}
            <div className="p-10 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/20 blur-[50px] group-hover:bg-indigo-500/40 transition-colors" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-all">
                <Stethoscope className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">السجلات الطبية EMR</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                تقييمات حركية، اختبارات خاصة، وخطط علاج إلكترونية بالكامل. وداعاً للورق.
              </p>
            </div>

            {/* Feature: Calendar */}
            <div className="p-10 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-purple-500/20 blur-[50px] group-hover:bg-purple-500/40 transition-colors" />
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-all">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">تقويم الحجوزات</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                تنظيم ذكي لمواعيد المرضى والجلسات بين الأطباء في واجهة تفاعلية سلسة.
              </p>
            </div>

            {/* Feature: Security */}
            <div className="p-10 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-emerald-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-emerald-500/20 blur-[50px] group-hover:bg-emerald-500/40 transition-colors" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-all">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">أمان وصلاحيات</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                تحكم كامل بمن يرى ماذا. صلاحيات مفصلة لكل فرد في طاقم العمل.
              </p>
            </div>

            {/* Feature: Analytics */}
            <div className="p-10 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-pink-500/30 transition-all duration-500 group relative overflow-hidden md:col-span-2 lg:col-span-3 lg:flex gap-10 items-center">
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-pink-500/10 blur-[80px] group-hover:bg-pink-500/20 transition-colors" />
              <div className="flex-shrink-0 w-24 h-24 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-8 lg:mb-0 shadow-[0_0_20px_rgba(236,72,153,0.2)] group-hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] group-hover:scale-105 transition-all">
                <BarChart3 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-4">تحليلات وإحصائيات متقدمة</h3>
                <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-3xl">
                  راقب نبض عيادتك. إحصائيات دقيقة للإيرادات، المدفوعات، والجلسات لتعرف أين يتجه مركزك المالي والطبي بضغطة زر واحدة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-32 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-[3rem] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 p-12 md:p-20 text-center relative overflow-hidden shadow-[0_0_100px_rgba(124,58,237,0.1)]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/30 blur-[100px] rounded-full" />
            
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-8 relative z-10">
              انطلق نحو <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">الاحترافية</span>
            </h2>
            <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto mb-12 relative z-10">
              لا تدع الإدارة التقليدية تعيق نمو عيادتك. انضم الآن إلى Prime Physio وابدأ التحول الرقمي الحقيقي.
            </p>
            <Link 
              href="/manage" 
              className="relative z-10 inline-flex px-12 py-5 rounded-full bg-white text-[#0B0F19] font-black text-xl hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all items-center gap-3"
            >
              ابدأ الآن - مجاناً <ArrowLeft className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#05080f] py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-xl text-white tracking-tight">Prime<span className="text-purple-500">Physio</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} Prime Physio. صُمم للمستقبل.
          </p>
        </div>
      </footer>
    </div>
  );
}
