"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// Centralized copy for the public landing page. Keys are the original Arabic
// phrases so existing Arabic content and CMS-managed copy remain unchanged.
const copy: Record<string, string> = {
  "الرئيسية":"Home","المميزات":"Features","كيف يعمل":"How it works","الأسعار":"Pricing","الأسئلة الشائعة":"FAQ","الدعم":"Support",
  "إغلاق القائمة":"Close menu","فتح القائمة":"Open menu","التنقل الرئيسي":"Main navigation","لوحة التحكم":"Dashboard","دخول المالك":"Owner login","أنشئ مركزك":"Create your clinic",
  "منصة متكاملة لإدارة مراكز العلاج الطبيعي":"An all-in-one platform for physical therapy clinics","إدارة مركزك الطبي":"Manage your clinic","بكل سهولة واحترافية":"with ease and confidence",
  "نظّم ملفات المرضى والجلسات والمواعيد والفريق والحسابات من مكان واحد. تجربة عربية واضحة تساعدك على متابعة تفاصيل مركزك واتخاذ قرارات أفضل.":"Manage patient records, sessions, appointments, staff, and finances in one place. A clear, intuitive experience helps you stay on top of your clinic and make better decisions.",
  "اكتشف المميزات":"Explore features","إدارة متكاملة للمرضى والجلسات":"Complete patient and session management","صلاحيات واضحة لفريق العمل":"Clear team permissions","متاح من أي جهاز":"Accessible from any device",
  "لوحة متابعة المركز":"Clinic overview","مرحباً بك في Prime Physio":"Welcome to Prime Physio","ملفات المرضى":"Patient records","إدارة منظمة":"Organized management","متابعة سهلة":"Easy follow-up",
  "الجلسات والمواعيد":"Sessions & appointments","جدول واضح":"Clear schedule","تنظيم يومك":"Organize your day","الحسابات":"Finance","متابعة مالية":"Financial tracking","تقارير دقيقة":"Accurate reports",
  "جدول الجلسات":"Session schedule","اليوم":"Today","متابعة حالة":"Follow-up visit","مكتملة":"Completed","جلسة علاج طبيعي":"Physiotherapy session","جارية":"In progress","تقييم أولي":"Initial assessment","قادمة":"Upcoming",
  "إدارة المركز":"Clinic management","الملفات الطبية":"Medical records","فريق العمل":"Team","التنبيهات":"Notifications","كل التفاصيل في مكان واحد":"Everything in one place","إدارة أكثر وضوحاً لمركزك":"A clearer way to manage your clinic","وقتك أكثر تنظيماً":"Make better use of your time",
  "مركز":"Clinics","جلسة":"Sessions","طبيب":"Doctors","رضا العملاء":"Customer satisfaction","دعم فني":"Support",
  "موثوق من قبل أفضل المراكز":"Trusted by leading clinics",
  "الحجوزات والجداول":"Appointments & scheduling","جدول مرن بالسحب والإفلات لكل أخصائي وغرفة، مع الحجوزات المتكررة والجلسات الجماعية وإعادة الجدولة.":"A flexible drag-and-drop schedule for every therapist and room, with recurring bookings, group sessions, and rescheduling.",
  "عرض يومي وأسبوعي واضح":"Clear daily and weekly views","سجل كامل لتغييرات المواعيد":"A complete appointment change history",
  "ملفات الحالات والتقييمات":"Patient records & assessments","ملف متكامل لكل حالة يشمل التشخيص والتاريخ المرضي والتقييمات والبرامج العلاجية وتوثيق مهام كل جلسة.":"A complete record for every patient, including diagnosis, medical history, assessments, treatment programs, and session notes.",
  "متابعة تطور الحالة":"Track patient progress","توثيق التقييمات والجلسات":"Document assessments and sessions",
  "المدفوعات والمستحقات":"Payments & balances","إدارة الإيصالات والفواتير وقوائم الأسعار وأسعار التأمين والتعاقدات، مع متابعة واضحة للمستحقات المتأخرة.":"Manage receipts, invoices, price lists, insurance rates, and contracts, with clear tracking of outstanding balances.",
  "متابعة الدفعات والفواتير":"Track payments and invoices","كشف بالمبالغ المستحقة":"Outstanding balance reports",
  "المرتبات والحضور بالـ QR":"Payroll & QR attendance","تسجيل حضور الفريق بمسح QR، وربط التأخيرات والأذونات والإجازات بسجلات المرتبات والحوافز وكشوف الرواتب.":"Record staff attendance with QR scans and link lateness, permissions, and leave to payroll, incentives, and payslips.",
  "تسجيل حضور سريع":"Fast attendance check-in","احتساب التأخيرات والإجازات":"Track lateness and leave",
  "التقارير ولوحة المتابعة":"Reports & dashboard","لوحة متابعة مباشرة وتقارير مالية وتقارير للجلسات والأخصائيين وتطور الحالات، جاهزة للطباعة والمشاركة.":"A live dashboard with financial, session, therapist, and patient progress reports, ready to print and share.",
  "مؤشرات أداء واضحة":"Clear performance indicators","تقارير قابلة للطباعة والمشاركة":"Reports ready to print and share",
  "الأدوار والصلاحيات":"Roles & permissions","صلاحيات مرنة للمدير والمشرف والسكرتارية والأخصائي والحالة، بحيث يرى كل مستخدم المعلومات المسموح بها فقط.":"Flexible permissions for owners, supervisors, receptionists, therapists, and patients, so everyone sees only what they are authorized to access.",
  "تحديد الصلاحيات حسب الدور":"Role-based access","تحكم الإدارة في الوصول":"Administrative access control",
  "كل تفاصيل مركزك… في مكان واحد":"Your entire clinic. One platform.","منظومة إدارة متكاملة":"An integrated management system",
  "تخلص من قيود جداول Excel وانتقل إلى نظام ذكي مصمم خصيصاً لمراكز العلاج الطبيعي.":"Move beyond spreadsheets with a smart system designed specifically for physical therapy clinics.",
  "لماذا Prime Physio أفضل من Excel؟":"Why Prime Physio instead of Excel?","جداول Excel":"Excel spreadsheets",
  "بطيء ويستغرق وقتاً طويلاً":"Slow and time-consuming","إدخال بيانات يدوي ومكرر":"Repetitive manual data entry","معرض للأخطاء البشرية":"Prone to human error",
  "خطر فقدان البيانات وتلف الملفات":"Risk of lost data and damaged files","لا توجد تكاملات أو تنبيهات آلية":"No integrations or automated alerts",
  "سريع وآلي بالكامل":"Fast and automated","إدارة سحابية آمنة وموثوقة":"Secure, reliable cloud management","دقة متناهية وبدون أخطاء":"Greater accuracy with fewer errors",
  "نسخ احتياطي تلقائي للبيانات":"Automatic data backups","متكامل مع أدوات العيادة الحديثة":"Integrated with modern clinic tools",
  "الفرق بين الماضي والمستقبل":"From the old way to a better future","تحول من الفوضى الورقية وإهدار الوقت إلى نظام إلكتروني متكامل يدير عيادتك بكفاءة وسهولة.":"Move from paperwork and wasted time to an integrated digital system that helps your clinic run efficiently.",
  "العيادة قديماً":"Before","مع PrimePhysio":"With Prime Physio","ملفات ورقية مبعثرة":"Scattered paper records","صعوبة في الوصول لتاريخ المريض وتفاصيل الجلسات.":"Patient histories and session details are hard to find.",
  "حجوزات مزدوجة":"Double bookings","أخطاء في المواعيد ونسيان إرسال تذكيرات للمرضى.":"Scheduling errors and missed patient reminders.",
  "صعوبة متابعة الحسابات":"Difficult financial tracking","تشتت في حسابات الدخل اليومي وجلسات المرضى.":"Daily income and patient session records are scattered.",
  "ملف إلكتروني متكامل (EMR)":"Complete electronic medical record (EMR)","وصول فوري لبيانات المريض، خطة العلاج، والملاحظات بضغطة زر.":"Instant access to patient details, treatment plans, and notes.",
  "تنظيم ذكي للمواعيد":"Smart appointment management","جدول مواعيد دقيق مع رسائل تذكير تلقائية عبر الواتساب.":"Accurate scheduling with automatic WhatsApp reminders.",
  "تقارير وحسابات دقيقة":"Accurate reports and finances","لوحة تحكم توضح أرباح العيادة، عدد الجلسات، ومدفوعات المرضى.":"A dashboard showing clinic revenue, session counts, and patient payments.",
  "اكتشف لوحة التحكم التفاعلية":"Explore the interactive dashboard","شاهد كيف تبدو واجهة Prime Physio من الداخل بنفس التصميم الحقيقي للمنصة.":"See how the Prime Physio interface looks and works from the inside.",
  "المرضى":"Patients","التقارير":"Reports","الإعدادات":"Settings","بحث عن مريض...":"Search for a patient...","متصل":"Online",
  "تكامل لا محدود":"Seamless integrations","اربط عيادتك بالعالم":"Connect your clinic","تزامن فوري ومباشر مع أهم التطبيقات لتسهيل الحجوزات والمدفوعات والتواصل مع مرضاك.":"Connect with essential apps to simplify appointments, payments, and patient communication.",
  "اجعل مركزك يعمل تلقائيًا":"Let your clinic run smarter","دع النظام يقوم بالمهام الروتينية لتركز أنت على صحة مرضاك ونمو عيادتك.":"Automate routine tasks so you can focus on patient care and growing your clinic.",
  "حجز مريض جديد":"New patient booking","تذكير تلقائي عبر واتساب":"Automatic WhatsApp reminder","إصدار فاتورة إلكترونية":"Generate an electronic invoice","دفع آمن":"Secure payment","متابعة ذكية (AI)":"Smart follow-up (AI)",
  "رحلة مريض":"The patient journey","استثنائية":"made exceptional","صممنا PrimePhysio ليتتبع كل خطوة يخطوها المريض في عيادتك، مما يضمن تجربة سلسة واحترافية.":"Prime Physio follows every step of the patient journey in your clinic, helping deliver a smooth, professional experience.",
  "حجز الموعد":"Appointment booking","يقوم المريض بحجز موعد عبر الإنترنت أو من خلال الاستقبال ويتم تسجيله في جدول المواعيد الذكي.":"Patients book online or at reception, and the appointment is added to the smart schedule.",
  "تذكير تلقائي":"Automatic reminder","يتلقى المريض رسالة تذكير تلقائية عبر الواتساب قبل موعد الجلسة لتقليل نسبة التخلف عن المواعيد.":"Patients receive an automatic WhatsApp reminder before their session to help reduce missed appointments.",
  "تسجيل الدخول":"Check-in","عند وصول المريض، يقوم موظف الاستقبال بتسجيل حضوره بضغطة زر وتحديث حالته للطبيب.":"When a patient arrives, reception checks them in and updates their status for the therapist.",
  "الجلسة و EMR":"Session & EMR","يقوم الطبيب بمعاينة الملف الطبي (EMR)، تسجيل الملاحظات، كتابة الوصفة، وتحديث خطة العلاج.":"The therapist reviews the EMR, records notes, writes prescriptions, and updates the treatment plan.",
  "الدفع والفوترة":"Payment & invoicing","دفع سلس عبر طرق متعددة (نقدي، بطاقة) مع إصدار فاتورة إلكترونية وتسجيلها في تقارير العيادة.":"Convenient cash and card payments, with electronic invoices recorded in clinic reports.",
  "المتابعة والتقييم":"Follow-up & evaluation","متابعة تقدم حالة المريض عبر رسائل تلقائية وقياس مدى رضاه عن الخدمة المقدمة.":"Track patient progress with automated messages and measure satisfaction with the service.",
  "الخصوصية والأمان":"Privacy & security","بيانات مركزك تبقى لمركزك":"Your clinic data stays yours","نستخدم ضوابط وصول وعزل على مستوى البيانات لحماية معلومات كل مركز، مع اتصال مشفّر وسجل لمراجعة الأنشطة.":"We use data-level access controls and isolation to protect each clinic’s information, with encrypted connections and activity logs.",
  "عزل بيانات كل مركز":"Clinic data isolation","صلاحيات حسب الدور":"Role-based permissions","سجل تدقيق للتغييرات":"Change audit log","اتصال آمن عبر HTTPS":"Secure HTTPS connection",
  "قصة نجاح عميل":"Customer success story","كيف ضاعف مركز Elite Physio أرباحه في 3 أشهر؟":"How did Elite Physio double its profits in three months?",
  "وفرنا 30% من وقت الاستقبال":"Saved 30% of reception time","زادت الحجوزات 40%":"Bookings increased by 40%","معدل احتفاظ بالمرضى":"Patient retention rate","نمو في الإيرادات الشهرية":"Monthly revenue growth",
  "احسب عائد الاستثمار (ROI)":"Calculate your return on investment (ROI)","اكتشف كم من الوقت والمال يمكنك توفيره شهرياً عند استخدام Prime Physio بدلاً من الطرق التقليدية.":"Estimate how much time and money you could save each month with Prime Physio.",
  "تفاصيل عيادتك":"Your clinic details","عدد المرضى شهرياً":"Patients per month","مريض":"patients","عدد الأطباء":"Number of therapists","أطباء":"therapists","التوفير المقدر شهرياً":"Estimated monthly savings","الوقت الموفر":"Time saved","ساعة عمل":"working hours","التكلفة الموفرة (تقريبياً)":"Estimated cost savings","ج.م / ريال":"EGP / SAR",
  "أسعار شفافة وبسيطة":"Simple, transparent pricing","اختر الباقة التي تناسب حجم وطموح مركزك. يمكنك الترقية أو الإلغاء في أي وقت.":"Choose the plan that fits your clinic. Upgrade or cancel at any time.",
  "شهري":"Monthly","سنوي":"Yearly","خصم 20% 🚀":"20% off 🚀","الأساسية (Starter)":"Starter","الفضية (Silver)":"Silver","الذهبية (Gold)":"Gold",
  "مثالية للعيادات الصغيرة والناشئة.":"Ideal for small and new clinics.","للمراكز المتنامية التي تحتاج لأدوات احترافية.":"For growing clinics that need professional tools.","للمستشفيات وسلاسل المراكز المتعددة.":"For hospitals and multi-location clinic groups.",
  "إدارة حتى 50 مريض":"Manage up to 50 patients","100 جلسة شهرياً":"100 sessions per month","20 حساب للأخصائيين":"20 therapist accounts","إدارة مركز واحد":"Manage one clinic","دعم فني عبر البريد":"Email support",
  "إدارة حتى 200 مريض":"Manage up to 200 patients","500 جلسة شهرياً":"500 sessions per month","50 حساب للأخصائيين":"50 therapist accounts","التقارير والتحليلات والتغذية العلاجية":"Reports, analytics, and clinical nutrition","دعم فني هاتفي":"Phone support",
  "عدد لا محدود من المرضى والجلسات":"Unlimited patients and sessions","حسابات غير محدودة للأخصائيين":"Unlimited therapist accounts","المكتبة العلاجية ورسائل التذكير":"Clinical library and reminders","إدارة فروع متعددة (حتى مركزين)":"Manage multiple branches (up to two clinics)","دعم VIP على مدار الساعة":"24/7 VIP support",
  "ابدأ مجانًا":"Start for free","ابدأ الإصدار الفضي":"Choose Silver","ابدأ الإصدار الذهبي":"Choose Gold","ابدأ الإصدار المميز":"Choose Premium","اشترك الآن":"Subscribe now",
  "الأسئلة الشائعة":"Frequently asked questions","هل أحتاج إلى خبرة تقنية سابقة لاستخدام المنصة؟":"Do I need technical experience to use the platform?",
  "لا أبداً. قمنا بتصميم Prime Physio ليكون بديهياً وسهل الاستخدام للجميع، بغض النظر عن خلفيتهم التقنية. واجهة المستخدم بسيطة ومباشرة، ونوفر مقاطع فيديو تعليمية قصيرة ودعم فني دائم.":"Not at all. Prime Physio is designed to be intuitive and easy to use, regardless of your technical background. The interface is straightforward, and we provide short tutorials and ongoing support.",
  "هل بيانات مرضاي آمنة؟":"Is my patients’ data secure?","كيف يمكنني إنشاء حساب للمركز؟":"How can I create a clinic account?","هل يمكنني إلغاء الاشتراك في أي وقت؟":"Can I cancel my subscription at any time?",
  "استكشف Prime Physio":"Explore Prime Physio","كيف يعمل النظام؟":"How it works","الباقات والأسعار":"Plans & pricing","للمراكز والعيادات":"For clinics and centers",
  "إنشاء حساب جديد":"Create an account","تواصل معنا":"Contact us","هل تحتاج إلى مساعدة؟ فريقنا هنا لمساعدتك.":"Need help? Our team is here for you.",
  "مصمم لمجتمع العلاج الطبيعي":"Built for the physiotherapy community","جميع الحقوق محفوظة.":"All rights reserved.","حلول تقنية ترتقي بإدارة العلاج الطبيعي":"Technology that elevates physiotherapy management","العودة إلى أعلى الصفحة":"Back to top","العودة للأعلى":"Back to top",
  "ابدأ بتنظيم مركزك مع Prime Physio":"Start organizing your clinic with Prime Physio","اجمع إدارة المرضى والجلسات والفريق والحسابات في مكان واحد.":"Bring patient, session, team, and financial management together in one place.",
  "أنشئ مركزك الآن":"Create your clinic","ابدأ الآن":"Get started","جاهز للعمل في ثلاث خطوات":"Ready in three simple steps",
  "أنشئ حسابك":"Create your account","سجّل كمالك مركز علاج طبيعي، وأكمل تفعيل حسابك من خلال رسالة التأكيد التي تصلك على بريدك الإلكتروني.":"Sign up as a clinic owner and activate your account using the confirmation email.",
  "جهّز مركزك":"Set up your clinic","اختر رابطًا مميزًا لمركزك، وأضف الخدمات والأسعار وبيانات فريق العمل حتى يصبح مركزك جاهزًا لاستقبال الحجوزات.":"Choose a unique clinic link, then add services, prices, and team details to get ready for bookings.",
  "ابدأ الحجز":"Start booking","شارك رابط مركزك مع المرضى وفريق العمل، وابدأ في تنظيم المواعيد ومتابعة الحجوزات من مكان واحد.":"Share your clinic link with patients and staff, then manage appointments and bookings from one place.",
  "منذ":"Since","التشخيص الحالي":"Current diagnosis","تاريخ الجلسات":"Session history","جلسة جديدة +":"New session +","هذا الشهر":"This month","إجمالي الإيرادات":"Total revenue","إجمالي المصروفات":"Total expenses","أحدث الفواتير":"Latest invoices","مدفوع":"Paid","مصروف":"Expense","متبقي":"Remaining","غرفة":"Room","كشف جديد":"New assessment",
};

function translateText(value: string, language: "ar" | "en") {
  if (language === "ar") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const exact = copy[trimmed];
  if (exact) return value.replace(trimmed, exact);
  // Translate known phrases inside text nodes while preserving surrounding markup.
  let result = value;
  for (const [ar, en] of Object.entries(copy).sort((a, b) => b[0].length - a[0].length)) {
    if (result.includes(ar)) result = result.split(ar).join(en);
  }
  return result;
}

export default function LandingLocale() {
  const { language } = useLanguage();

  useEffect(() => {
    const root = document.querySelector(".pp-landing");
    if (!root) return;

    const originals = new WeakMap<Text, string>();
    const apply = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node as Text;
        if (!originals.has(text)) originals.set(text, text.data);
        const original = originals.get(text) ?? text.data;
        const next = translateText(original, language);
        if (text.data !== next) text.data = next;
      }
      if (node instanceof HTMLElement) {
        for (const attr of ["aria-label", "title", "placeholder", "alt"]) {
          const value = node.getAttribute(attr);
          if (value) {
            const translated = translateText(value, language);
            if (translated !== value) node.setAttribute(attr, translated);
          }
        }
        if (node.hasAttribute("dir")) node.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
        if (node.hasAttribute("lang")) node.setAttribute("lang", language);
      }
    };

    const walk = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) apply(node);
      if (root instanceof HTMLElement) root.dir = language === "ar" ? "rtl" : "ltr";
    };
    walk();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") apply(record.target);
        record.addedNodes.forEach((node) => {
          apply(node);
          if (node instanceof HTMLElement) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            let child: Node | null;
            while ((child = walker.nextNode())) apply(child);
          }
        });
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
