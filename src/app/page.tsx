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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white" dir="rtl">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-800">Prime<span className="text-indigo-600">Physio</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/manage" 
              className="px-6 py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-sm"
            >
              تسجيل الدخول
            </Link>
            <Link 
              href="/manage" 
              className="hidden sm:flex px-6 py-2.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm items-center gap-2"
            >
              ابدأ مجاناً <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6 overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-20 right-1/2 translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ShieldCheck className="w-4 h-4" /> الخيار رقم #1 لعيادات العلاج الطبيعي
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            الإدارة الأذكى لعيادة <br className="hidden md:block"/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-600 to-purple-600">
              العلاج الطبيعي والتأهيل
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            ارتقِ بمستوى عيادتك الطبية من خلال نظام متكامل يجمع بين السجلات الطبية الإلكترونية، إدارة الحجوزات، المحاسبة، وتقييمات التأهيل في مكان واحد.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              href="/manage" 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              أنشئ عيادتك الآن <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              استكشف المميزات
            </Link>
          </div>
        </div>

        {/* Physical Therapy Image / Graphic */}
        <div className="max-w-5xl mx-auto mt-16 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 pointer-events-none" />
          
          <div className="relative z-0 rounded-[2.5rem] border border-slate-200/60 bg-white/50 backdrop-blur-sm p-2 md:p-4 shadow-2xl shadow-indigo-900/10">
            <div className="rounded-[2rem] overflow-hidden border border-slate-100 relative bg-slate-100 aspect-[16/9] sm:aspect-[21/9]">
              <img src="/landing-hero.png" alt="Physical Therapy Clinic" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-indigo-900/10 mix-blend-multiply" />
            </div>

            {/* Floating Card 1 */}
            <div className="absolute -left-6 top-1/4 bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-right-8 duration-700 delay-700 hidden md:flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">مرضى نشطين</p>
                <p className="text-xl font-black text-slate-800">+2,400</p>
              </div>
            </div>

            {/* Floating Card 2 */}
            <div className="absolute -right-6 bottom-1/4 bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-left-8 duration-700 delay-1000 hidden md:flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">جلسات مكتملة</p>
                <p className="text-xl font-black text-slate-800">+15,000</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-800">كل ما تحتاجه لإدارة ناجحة</h2>
            <p className="text-lg text-slate-500 font-medium">أدوات مصممة خصيصاً لتلبية احتياجات أطباء العلاج الطبيعي والتأهيل الحركي.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">السجلات الطبية (EMR)</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                ملفات إلكترونية مفصلة تشمل التقييمات الحركية (ROM, MMT)، الاختبارات الخاصة، خطط العلاج والملاحظات اليومية.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">إدارة الحجوزات والجلسات</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                تقويم ذكي لتنظيم مواعيد المرضى، متابعة حضورهم، وتوزيع الجلسات على الممارسين بكل سهولة ومرونة.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">شجرة الصلاحيات</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                تحكم كامل في صلاحيات طاقم العمل (أخصائي، ممارس، موظف استقبال) مع تحديد دقيق لما يمكنهم رؤيته وتعديله.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">المكتبة الإكلينيكية الذكية</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                مكتبة مدمجة تحتوي على بروتوكولات العلاج، التمارين، والاختبارات الجاهزة للاستخدام بضغطة زر داخل الجلسات.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 lg:col-span-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">تقارير وتحليلات متقدمة</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                لوحة تحكم إحصائية قوية تعطيك نظرة دقيقة على إيرادات العيادة، عدد الجلسات، أداء الأطباء، ونمو قاعدة مرضاك لحظة بلحظة وبدقة متناهية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
        
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            مستعد لنقل عيادتك إلى المستوى التالي؟
          </h2>
          <p className="text-xl text-indigo-100 font-medium">
            انضم إلى شبكة العيادات التي تعتمد على Prime Physio اليوم واكتشف الفرق بنفسك.
          </p>
          <div className="pt-4">
            <Link 
              href="/manage" 
              className="inline-flex px-10 py-5 rounded-2xl bg-white text-indigo-900 font-black text-xl hover:bg-indigo-50 hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-1 transition-all items-center gap-3"
            >
              ابدأ الآن - مجاناً <ArrowLeft className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            <span className="font-bold text-xl text-white tracking-tight">Prime<span className="text-indigo-500">Physio</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} Prime Physio. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
