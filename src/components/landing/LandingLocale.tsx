"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// Centralized copy for the public landing page. Keys are the original Arabic
// phrases so existing Arabic content and CMS-managed copy remain unchanged.
const copy: Record<string, string> = {
  "نظام إدارة متكامل لمراكز العلاج الطبيعي":"An integrated management system for physiotherapy clinics",
  "منظومة إدارة متكاملة":"An integrated clinic management system",
  "كل تفاصيل مركزك… في مكان واحد":"Everything your clinic needs, all in one place",
  "أدوات مترابطة لتنظيم المواعيد والملفات الطبية والحسابات والفريق، مع تحكم واضح في البيانات والتقارير.":"Connected tools for appointments, medical records, finances, and staff—with clear control over your data and reports.",
  "العيادة قديماً":"The old way",
  "مع PrimePhysio":"With Prime Physio",
  "الفرق بين الماضي والمستقبل":"The old way vs. a better future",
  "تحول من الفوضى الورقية وإهدار الوقت إلى نظام إلكتروني متكامل يدير عيادتك بكفاءة وسهولة.":"Move from paperwork and wasted time to an integrated digital system that manages your clinic efficiently.",
  "أنشئ حساب مركزك الآن":"Create your clinic account now",
  "أنشئ حساب مركزك":"Create your clinic account",
  "أنشئ مركزك الآن":"Create your clinic now",
  "ج.م":"EGP",
  "ملفات ورقية مبعثرة":"Scattered paper records",
  "صعوبة في الوصول لتاريخ المريض وتفاصيل الجلسات.":"Patient histories and session details are difficult to find.",
  "حجوزات مزدوجة":"Double bookings",
  "أخطاء في المواعيد ونسيان إرسال تذكيرات للمرضى.":"Scheduling errors and forgotten patient reminders.",
  "صعوبة متابعة الحسابات":"Difficult financial tracking",
  "تشتت في حسابات الدخل اليومي وجلسات المرضى.":"Scattered daily income and patient session records.",

  "موثوق من قبل أفضل المراكز":"Trusted by leading clinics",
  "الرئيسية":"Home","المرضى":"Patients","الحسابات":"Billing","التقارير":"Analytics","الإعدادات":"Settings","متصل":"Online","بحث عن مريض...":"Search for a patient...","أخصائي":"Therapist",
  "اكتشف لوحة التحكم التفاعلية":"Explore the interactive dashboard","شاهد كيف تبدو واجهة Prime Physio من الداخل بنفس التصميم الحقيقي للمنصة.":"See the real Prime Physio interface in action.",
  
  
  
  "ملف إلكتروني متكامل (EMR)":"Complete electronic medical record (EMR)","وصول فوري لبيانات المريض، خطة العلاج، والملاحظات بضغطة زر.":"Instant access to patient details, treatment plans, and notes.",
  "تنظيم ذكي للمواعيد":"Smart appointment management","جدول مواعيد دقيق مع رسائل تذكير تلقائية عبر الواتساب.":"Accurate scheduling with automatic WhatsApp reminders.",
  "تقارير وحسابات دقيقة":"Accurate reports and finances","لوحة تحكم توضح أرباح العيادة، عدد الجلسات، ومدفوعات المرضى.":"A dashboard showing clinic revenue, session counts, and patient payments.",
  
  "مركز":"Clinics","جلسة":"Sessions","طبيب":"Therapists","رضا العملاء":"Customer satisfaction","دعم فني":"Support",
  "لماذا Prime Physio أفضل من Excel؟":"Why Prime Physio instead of Excel?","تخلص من قيود جداول Excel وانتقل إلى نظام ذكي مصمم خصيصاً لمراكز العلاج الطبيعي.":"Move beyond spreadsheets with a smart system designed specifically for physiotherapy clinics.","جداول Excel":"Excel spreadsheets",
  "بطيء ويستغرق وقتاً طويلاً":"Slow and time-consuming","إدخال بيانات يدوي ومكرر":"Repetitive manual data entry","معرض للأخطاء البشرية":"Prone to human error","خطر فقدان البيانات وتلف الملفات":"Risk of lost data and damaged files","لا توجد تكاملات أو تنبيهات آلية":"No integrations or automated alerts",
  "سريع وآلي بالكامل":"Fast and automated","إدارة سحابية آمنة وموثوقة":"Secure, reliable cloud management","دقة متناهية وبدون أخطاء":"Greater accuracy with fewer errors","نسخ احتياطي تلقائي للبيانات":"Automatic data backups","متكامل مع أدوات العيادة الحديثة":"Integrated with modern clinic tools",
  "الحجوزات والجداول":"Appointments & scheduling","جدول مرن بالسحب والإفلات لكل أخصائي وغرفة، مع الحجوزات المتكررة والجلسات الجماعية وإعادة الجدولة.":"A flexible drag-and-drop schedule for every therapist and room, with recurring bookings, group sessions, and rescheduling.","عرض يومي وأسبوعي واضح":"Clear daily and weekly views","سجل كامل لتغييرات المواعيد":"A complete appointment change history",
  "ملفات الحالات والتقييمات":"Patient records & assessments","ملف متكامل لكل حالة يشمل التشخيص والتاريخ المرضي والتقييمات والبرامج العلاجية وتوثيق مهام كل جلسة.":"A complete record for every patient, including diagnosis, medical history, assessments, treatment programs, and session notes.","متابعة تطور الحالة":"Track patient progress","توثيق التقييمات والجلسات":"Document assessments and sessions",
  "المدفوعات والمستحقات":"Payments & balances","إدارة الإيصالات والفواتير وقوائم الأسعار وأسعار التأمين والتعاقدات، مع متابعة واضحة للمستحقات المتأخرة.":"Manage receipts, invoices, price lists, insurance rates, and contracts, with clear tracking of outstanding balances.","متابعة الدفعات والفواتير":"Track payments and invoices","كشف بالمبالغ المستحقة":"Outstanding balance reports",
  "المرتبات والحضور بالـ QR":"Payroll & QR attendance","تسجيل حضور الفريق بمسح QR، وربط التأخيرات والأذونات والإجازات بسجلات المرتبات والحوافز وكشوف الرواتب.":"Record staff attendance with QR scans and link lateness, permissions, and leave to payroll, incentives, and payslips.","تسجيل حضور سريع":"Fast attendance check-in","احتساب التأخيرات والإجازات":"Track lateness and leave",
  "التقارير ولوحة المتابعة":"Reports & dashboard","لوحة متابعة مباشرة وتقارير مالية وتقارير للجلسات والأخصائيين وتطور الحالات، جاهزة للطباعة والمشاركة.":"A live dashboard with financial, session, therapist, and patient progress reports, ready to print and share.","مؤشرات أداء واضحة":"Clear performance indicators","تقارير قابلة للطباعة والمشاركة":"Reports ready to print and share",
  "الأدوار والصلاحيات":"Roles & permissions","صلاحيات مرنة للمدير والمشرف والسكرتارية والأخصائي والحالة، بحيث يرى كل مستخدم المعلومات المسموح بها فقط.":"Flexible permissions for owners, supervisors, receptionists, therapists, and patients, so everyone sees only what they are authorized to access.","تحديد الصلاحيات حسب الدور":"Role-based access","تحكم الإدارة في الوصول":"Administrative access control",
  "ابدأ الآن":"Get started","من إنشاء حساب المركز إلى استقبال أول حجز — ابدأ بسهولة مع Prime Physio.":"From creating your clinic account to receiving your first booking—get started with Prime Physio.",
  "قصص نجاح عملائنا":"Customer success stories","انضم إلى مئات المراكز التي ضاعفت كفاءتها وأرباحها باستخدام منصتنا":"Join clinics that have improved their efficiency and performance with our platform",
  "تكامل لا محدود":"Seamless integrations","اربط عيادتك بالعالم":"Connect your clinic","تزامن فوري ومباشر مع أهم التطبيقات لتسهيل الحجوزات والمدفوعات والتواصل مع مرضاك.":"Connect with essential apps to simplify appointments, payments, and patient communication.",
  "اجعل مركزك يعمل تلقائيًا":"Let your clinic run smarter","دع النظام يقوم بالمهام الروتينية لتركز أنت على صحة مرضاك ونمو عيادتك.":"Automate routine tasks so you can focus on patient care and growing your clinic.",
  "حجز مريض جديد":"New patient booking","تذكير تلقائي عبر واتساب":"Automatic WhatsApp reminder","إصدار فاتورة إلكترونية":"Generate an electronic invoice","دفع آمن":"Secure payment","متابعة ذكية (AI)":"Smart follow-up (AI)",
  "حجز الموعد":"Appointment booking","يقوم المريض بحجز موعد عبر الإنترنت أو من خلال الاستقبال ويتم تسجيله في جدول المواعيد الذكي.":"Patients book online or at reception, and the appointment is added to the smart schedule.",
  "تذكير تلقائي":"Automatic reminder","يتلقى المريض رسالة تذكير تلقائية عبر الواتساب قبل موعد الجلسة لتقليل نسبة التخلف عن المواعيد.":"Patients receive an automatic WhatsApp reminder before their session to help reduce missed appointments.",
  "تسجيل الدخول":"Check-in","عند وصول المريض، يقوم موظف الاستقبال بتسجيل حضوره بضغطة زر وتحديث حالته للطبيب.":"When a patient arrives, reception checks them in and updates their status for the therapist.",
  "الجلسة و EMR":"Session & EMR","يقوم الطبيب بمعاينة الملف الطبي (EMR)، تسجيل الملاحظات، كتابة الوصفة، وتحديث خطة العلاج.":"The therapist reviews the EMR, records notes, writes prescriptions, and updates the treatment plan.",
  "الدفع والفوترة":"Payment & invoicing","دفع سلس عبر طرق متعددة (نقدي، بطاقة) مع إصدار فاتورة إلكترونية وتسجيلها في تقارير العيادة.":"Convenient cash and card payments, with electronic invoices recorded in clinic reports.",
  "المتابعة والتقييم":"Follow-up & evaluation","متابعة تقدم حالة المريض عبر رسائل تلقائية وقياس مدى رضاه عن الخدمة المقدمة.":"Track patient progress with automated messages and measure satisfaction with the service.",
  "رحلة مريض":"The patient journey","استثنائية":"made exceptional","صممنا PrimePhysio ليتتبع كل خطوة يخطوها المريض في عيادتك، مما يضمن تجربة سلسة واحترافية.":"Prime Physio follows every step of the patient journey in your clinic, helping deliver a smooth, professional experience.",
  "الخصوصية والأمان":"Privacy & security","بيانات مركزك تبقى لمركزك":"Your clinic data stays yours","نستخدم ضوابط وصول وعزل على مستوى البيانات لحماية معلومات كل مركز، مع اتصال مشفّر وسجل لمراجعة الأنشطة.":"We use data-level access controls and isolation to protect each clinic’s information, with encrypted connections and activity logs.",
  "عزل بيانات كل مركز":"Clinic data isolation","تُخزَّن بيانات المراكز في قاعدة Supabase مشتركة، مع ربط سجلات المركز بمعرّفه وتطبيق سياسات Row Level Security (RLS) لتقييد الوصول إلى بياناته.":"Clinic data is stored in a shared Supabase database. Records are linked to each clinic and protected by Row Level Security (RLS) policies.",
  "صلاحيات حسب الدور":"Role-based permissions","تُطبَّق صلاحيات الوصول وفق حساب المستخدم ودوره داخل المركز، بحيث لا يحصل كل مستخدم إلا على الصلاحيات الممنوحة له.":"Access permissions are based on each user’s account and role, limiting access to the permissions granted to them.",
  "سجل تدقيق للتغييرات":"Change audit log","يوفر النظام سجل تدقيق لتوثيق الإجراءات المرتبطة بالمستخدم والمركز، بما يساعد على مراجعة الأنشطة وتتبعها.":"The system maintains an audit log of user and clinic actions to support activity reviews and traceability.",
  "اتصال آمن عبر HTTPS":"Secure HTTPS connection","يُقدَّم الموقع عبر اتصال HTTPS مشفّر لحماية البيانات أثناء انتقالها بين المتصفح والخدمة.":"The website uses encrypted HTTPS to protect data in transit between the browser and the service.",
  "قصة نجاح عميل":"Customer success story","المدير الطبي لمركز Elite Physio":"Medical Director, Elite Physio","وفر":"saved","معدل احتفاظ بالمرضى":"Patient retention rate","نمو في الإيرادات الشهرية":"Monthly revenue growth",
  "احسب عائد الاستثمار (ROI)":"Calculate your return on investment (ROI)","اكتشف كم من الوقت والمال يمكنك توفيره شهرياً عند استخدام Prime Physio بدلاً من الطرق التقليدية.":"Estimate how much time and money you could save each month with Prime Physio.",
  "تفاصيل عيادتك":"Your clinic details","عدد المرضى شهرياً":"Patients per month","مريض":"patients","عدد الأطباء":"Number of therapists","أطباء":"therapists","التوفير المقدر شهرياً":"Estimated monthly savings","الوقت الموفر":"Time saved","ساعة عمل":"working hours","التكلفة الموفرة (تقريبياً)":"Estimated cost savings","ج.م / ريال":"EGP / SAR",
  "* هذا الحساب تقريبي ويعتمد على تقليل الأعمال الإدارية اليدوية وتوفير وقت الطاقم الطبي.":"* This is an estimate based on reducing manual administrative work and saving staff time.",
  "كل ما تحتاج معرفته عن Prime Physio":"Everything you need to know about Prime Physio",
  "استكشف Prime Physio":"Explore Prime Physio","كيف يعمل النظام؟":"How it works","الباقات والأسعار":"Plans & pricing","للمراكز والعيادات":"For clinics and centers",
  "إنشاء حساب جديد":"Create an account","تواصل مع فريقنا":"Contact our team","يسعدنا تواصلك":"We’d love to hear from you","هل لديك سؤال أو تحتاج إلى مساعدة؟ فريقنا هنا لمساعدتك.":"Have a question or need help? Our team is here for you.",
  "منصتك الذكية لإدارة مراكز وعيادات العلاج الطبيعي؛ نظّم المرضى والجلسات":"Your smart platform for managing physiotherapy clinics. Organize patients, sessions","والفريق والحسابات من مكان واحد، وامنح مركزك تجربة إدارة أكثر سهولة واحترافية.":"staff, and finances in one place with a smoother, more professional workflow.",
  "إدارة منظمة وبيانات محمية":"Organized management and protected data","مصمم لمجتمع العلاج الطبيعي":"Built for the physiotherapy community","جميع الحقوق محفوظة.":"All rights reserved.","حلول تقنية ترتقي بإدارة العلاج الطبيعي":"Technology that elevates physiotherapy management","العودة للأعلى":"Back to top",
  "Prime Physio - الصفحة الرئيسية":"Prime Physio - Home page",
  "أحمد محمد عبد الله":"Ahmed Mohamed Abdallah","رقم الملف: #1042":"File No.: #1042","التشخيص الحالي":"Current diagnosis","انزلاق غضروفي قطني (L4-L5) مع ألم عرق النسا.":"Lumbar disc herniation (L4-L5) with sciatica.","مخطط الجسم (Body Chart)":"Body chart","تاريخ الجلسات":"Session history","جلسة جديدة +":"New session +","جلسة علاج طبيعي - ليزر وموجات فوق صوتية":"Physiotherapy session – laser and ultrasound","منذ":"Since","بواسطة د. أحمد":"by Dr. Ahmed","التقارير المالية":"Financial reports","هذا الشهر":"This month","إجمالي الإيرادات":"Total revenue","إجمالي المصروفات":"Total expenses","+15% عن الشهر الماضي":"+15% vs. last month","+5% عن الشهر الماضي":"+5% vs. last month","أحدث الفواتير":"Latest invoices","فاتورة كشف - مريض محمد علي":"Consultation invoice – Mohamed Ali","باقة 6 جلسات - مريضة سارة":"6-session package – Sarah","شراء مستلزمات طبية":"Medical supplies purchase","جلسة ليزر - مريض كريم":"Laser session – Karim","مدفوع":"Paid","مصروف":"Expense","متبقي":"Remaining","جدول المواعيد":"Appointment schedule","اليوم":"Today","أسبوع":"Week","شهر":"Month","محمود خالد":"Mahmoud Khaled","غرفة 1 - د. أحمد":"Room 1 – Dr. Ahmed","سعاد حسن":"Souad Hassan","طارق عبد السلام":"Tarek Abdelsalam","منى سيد":"Mona Sayed","كشف جديد":"New assessment",
  
  "لوحة متابعة المركز":"Clinic overview","مرحباً بك في Prime Physio":"Welcome to Prime Physio","ملفات المرضى":"Patient records","إدارة منظمة":"Organized management","متابعة سهلة":"Easy follow-up","الجلسات والمواعيد":"Sessions & appointments","جدول واضح":"Clear schedule","تنظيم يومك":"Organize your day","متابعة مالية":"Financial tracking","تقارير دقيقة":"Accurate reports","جدول الجلسات":"Session schedule","متابعة حالة":"Follow-up visit","مكتملة":"Completed","جلسة علاج طبيعي":"Physiotherapy session","جارية":"In progress","تقييم أولي":"Initial assessment","قادمة":"Upcoming","إدارة المركز":"Clinic management","الملفات الطبية":"Medical records","فريق العمل":"Team","التنبيهات":"Notifications","كل التفاصيل في مكان واحد":"Everything in one place","إدارة أكثر وضوحاً لمركزك":"A clearer way to manage your clinic","وقتك أكثر تنظيماً":"Make better use of your time",

  "المميزات":"Features","كيف يعمل":"How it works","الأسعار":"Pricing","الأسئلة الشائعة":"FAQ","الدعم":"Support",
  "إغلاق القائمة":"Close menu","فتح القائمة":"Open menu","التنقل الرئيسي":"Main navigation","لوحة التحكم":"Dashboard","دخول المالك":"Owner login","أنشئ مركزك":"Create your clinic",
  "منصة متكاملة لإدارة مراكز العلاج الطبيعي":"An all-in-one platform for physical therapy clinics","إدارة مركزك الطبي":"Manage your clinic","بكل سهولة واحترافية":"with ease and confidence",
  "نظّم ملفات المرضى والجلسات والمواعيد والفريق والحسابات من مكان واحد. تجربة عربية واضحة تساعدك على متابعة تفاصيل مركزك واتخاذ قرارات أفضل.":"Manage patient records, sessions, appointments, staff, and finances in one place. A clear, intuitive experience helps you stay on top of your clinic and make better decisions.",
  "اكتشف المميزات":"Explore features","إدارة متكاملة للمرضى والجلسات":"Complete patient and session management","صلاحيات واضحة لفريق العمل":"Clear team permissions","متاح من أي جهاز":"Accessible from any device",
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  "كيف ضاعف مركز Elite Physio أرباحه في 3 أشهر؟":"How did Elite Physio double its profits in three months?",
  "وفرنا 30% من وقت الاستقبال":"Saved 30% of reception time","زادت الحجوزات 40%":"Bookings increased by 40%",
  
  
  "أسعار شفافة وبسيطة":"Simple, transparent pricing","اختر الباقة التي تناسب حجم وطموح مركزك. يمكنك الترقية أو الإلغاء في أي وقت.":"Choose the plan that fits your clinic. Upgrade or cancel at any time.",
  "شهري":"Monthly","سنوي":"Yearly","خصم 20% 🚀":"20% off 🚀","الأساسية (Starter)":"Starter","الفضية (Silver)":"Silver","الذهبية (Gold)":"Gold",
  "مثالية للعيادات الصغيرة والناشئة.":"Ideal for small and new clinics.","للمراكز المتنامية التي تحتاج لأدوات احترافية.":"For growing clinics that need professional tools.","للمستشفيات وسلاسل المراكز المتعددة.":"For hospitals and multi-location clinic groups.",
  "إدارة حتى 50 مريض":"Manage up to 50 patients","100 جلسة شهرياً":"100 sessions per month","20 حساب للأخصائيين":"20 therapist accounts","إدارة مركز واحد":"Manage one clinic","دعم فني عبر البريد":"Email support",
  "إدارة حتى 200 مريض":"Manage up to 200 patients","500 جلسة شهرياً":"500 sessions per month","50 حساب للأخصائيين":"50 therapist accounts","التقارير والتحليلات والتغذية العلاجية":"Reports, analytics, and clinical nutrition","دعم فني هاتفي":"Phone support",
  "عدد لا محدود من المرضى والجلسات":"Unlimited patients and sessions","حسابات غير محدودة للأخصائيين":"Unlimited therapist accounts","المكتبة العلاجية ورسائل التذكير":"Clinical library and reminders","إدارة فروع متعددة (حتى مركزين)":"Manage multiple branches (up to two clinics)","دعم VIP على مدار الساعة":"24/7 VIP support",
  "ابدأ مجانًا":"Start for free","ابدأ الإصدار الفضي":"Choose Silver","ابدأ الإصدار الذهبي":"Choose Gold","ابدأ الإصدار المميز":"Choose Premium","اشترك الآن":"Subscribe now",
  "الأسئلة الشائعة (duplicate)":"Frequently asked questions","هل أحتاج إلى خبرة تقنية سابقة لاستخدام المنصة؟":"Do I need technical experience to use the platform?",
  "لا أبداً. قمنا بتصميم Prime Physio ليكون بديهياً وسهل الاستخدام للجميع، بغض النظر عن خلفيتهم التقنية. واجهة المستخدم بسيطة ومباشرة، ونوفر مقاطع فيديو تعليمية قصيرة ودعم فني دائم.":"Not at all. Prime Physio is designed to be intuitive and easy to use, regardless of your technical background. The interface is straightforward, and we provide short tutorials and ongoing support.",
  "هل بيانات مرضاي آمنة؟":"Is my patients’ data secure?","كيف يمكنني إنشاء حساب للمركز؟":"How can I create a clinic account?","هل يمكنني إلغاء الاشتراك في أي وقت؟":"Can I cancel my subscription at any time?",
  
  "تواصل معنا":"Contact us","هل تحتاج إلى مساعدة؟ فريقنا هنا لمساعدتك.":"Need help? Our team is here for you.",
  "العودة إلى أعلى الصفحة":"Back to top",
  "ابدأ بتنظيم مركزك مع Prime Physio":"Start organizing your clinic with Prime Physio","اجمع إدارة المرضى والجلسات والفريق والحسابات في مكان واحد.":"Bring patient, session, team, and financial management together in one place.",
  "جاهز للعمل في ثلاث خطوات":"Ready in three simple steps",
  "أنشئ حسابك":"Create your account","سجّل كمالك مركز علاج طبيعي، وأكمل تفعيل حسابك من خلال رسالة التأكيد التي تصلك على بريدك الإلكتروني.":"Sign up as a clinic owner and activate your account using the confirmation email.",
  "جهّز مركزك":"Set up your clinic","اختر رابطًا مميزًا لمركزك، وأضف الخدمات والأسعار وبيانات فريق العمل حتى يصبح مركزك جاهزًا لاستقبال الحجوزات.":"Choose a unique clinic link, then add services, prices, and team details to get ready for bookings.",
  "ابدأ الحجز":"Start booking","شارك رابط مركزك مع المرضى وفريق العمل، وابدأ في تنظيم المواعيد ومتابعة الحجوزات من مكان واحد.":"Share your clinic link with patients and staff, then manage appointments and bookings from one place.",

  
  "هل بيانات المرضى آمنة على النظام؟":"Is patient data secure on the platform?",
  "بالتأكيد. أمان البيانات هو أولويتنا القصوى. نستخدم معايير تشفير متقدمة (AES 256) لحماية جميع البيانات، ونقوم بنسخ احتياطي يومي على خوادم سحابية آمنة، مع تطبيق معايير الخصوصية الصارمة.":"Absolutely. Data security is a top priority. We use advanced encryption standards (AES 256), daily backups on secure cloud servers, and strict privacy controls.",
  "هل يمكنني ربط فروع عيادتي المختلفة في حساب واحد؟":"Can I manage multiple clinic branches from one account?",
  "نعم! إذا كنت تمتلك أكثر من فرع (باقة Enterprise)، يمكنك إدارتها جميعاً من نفس الحساب. ستتمكن من استخراج تقارير منفصلة لكل فرع، وتخصيص صلاحيات للموظفين بناءً على الفرع الذي يعملون به.":"Yes. With the Enterprise plan, you can manage multiple branches from one account, generate separate reports, and assign staff permissions by branch.",
  "ما هي طرق الدفع المدعومة؟":"Which payment methods are supported?",
  "نحن ندعم الدفع الإلكتروني عبر بطاقات الفيزا والماستركارد المحلية والدولية، بالإضافة إلى طرق الدفع المحلية الأخرى مثل المحافظ الإلكترونية.":"We support online payments through local and international Visa and Mastercard, along with local payment methods such as e-wallets.",
  "هل أستطيع نقل بياناتي القديمة إلى Prime Physio؟":"Can I transfer my existing data to Prime Physio?",
  "نعم، يوفر فريق الدعم الفني لدينا خدمة مجانية لنقل بياناتك القديمة (مثل قوائم المرضى من ملفات Excel) إلى نظامنا بسرعة وبدون أخطاء.":"Yes. Our support team offers a free service to transfer your existing data, such as patient lists from Excel, into the platform.",
  "منصتك الذكية لإدارة مراكز وعيادات العلاج الطبيعي؛ نظّم المرضى والجلسات والفريق والحسابات من مكان واحد، وامنح مركزك تجربة إدارة أكثر سهولة واحترافية.":"Your smart platform for managing physiotherapy clinics. Organize patients, sessions, staff, and finances in one place with a smoother, more professional workflow.",
  
  "تسجيل الدخول (duplicate)":"Sign in","تفاصيل تصنع الفارق":"The details make the difference",
  "تعرف عن قرب على الأدوات التي ستغير طريقة إدارتك لعيادتك بالكامل.":"Discover the tools that can transform the way you manage your clinic.",
  "سجل طبي إلكتروني (EMR) متطور":"Advanced electronic medical records (EMR)",
  "صممنا السجل الطبي خصيصاً ليناسب عيادات العلاج الطبيعي. يمكنك إضافة تشخيصات دقيقة، صور الأشعة، قياسات المفاصل (ROM)، وتتبع تطور حالة المريض بكل سهولة. لم تعد بحاجة للورق بعد اليوم.":"Designed for physiotherapy clinics, the EMR lets you record diagnoses, imaging, joint range-of-motion measurements, and patient progress—all without paperwork.",
  "مخطط الجسم (Body Chart) لتحديد أماكن الألم بدقة.":"Body charts to pinpoint areas of pain.","قوالب جاهزة للتقييم والتشخيص.":"Ready-to-use assessment and diagnosis templates.",
  "إرفاق صور الأشعة والتحاليل في ملف المريض.":"Attach imaging and lab results to patient records.","متابعة تاريخ الجلسات والملاحظات السريرية.":"Track session history and clinical notes.",
  "نظام مالي وإدارة فواتير متكامل":"Integrated finance and invoicing",
  "تتبع كل جنيه يدخل أو يخرج من العيادة. نظام مالي ذكي يقوم بإنشاء الفواتير، تتبع المدفوعات، وإدارة المصروفات بدقة متناهية مع تقارير شاملة لأرباح العيادة.":"Track every amount coming into or going out of your clinic. Create invoices, monitor payments, manage expenses, and review comprehensive financial reports.",
  "إصدار فواتير إلكترونية للمرضى بنقرة واحدة.":"Issue electronic patient invoices in one click.","تتبع الدفعات الجزئية والمبالغ المتبقية.":"Track partial payments and outstanding balances.",
  "تسجيل المصروفات اليومية للعيادة.":"Record daily clinic expenses.","تقارير أرباح وخسائر شهرية وسنوية.":"Monthly and annual profit and loss reports.",
  "جدولة ذكية وإدارة المواعيد":"Smart scheduling and appointment management",
  "نظم وقتك ووقت مرضاك باستخدام تقويم ذكي ومرن. يمكنك رؤية مواعيد جميع الأطباء في العيادة، وإضافة الجلسات، أو إعادة جدولتها بكل سهولة.":"Organize your time and your patients’ time with a flexible calendar. View all therapists’ appointments, add sessions, and reschedule with ease.",
  "عرض التقويم يومياً، أسبوعياً، وشهرياً.":"Daily, weekly, and monthly calendar views.","ترميز الألوان لمعرفة حالة كل موعد.":"Color-coded appointment statuses.",
  "إدارة غرف الكشف وأجهزة العلاج الطبيعي.":"Manage treatment rooms and physiotherapy equipment.","تجنب تضارب المواعيد بين الأخصائيين.":"Prevent scheduling conflicts between therapists.",
  
  
  
  
  "مركزك":"your clinic","المركز":"clinic","الحساب":"account","جلسات":"sessions","المواعيد":"appointments","المرضى (duplicate)":"patients",
  
  
  "صاحب مركز Elite Physio":"Owner, Elite Physio Clinic","مديرة عيادة":"Clinic manager","دكتور علاج طبيعي":"Physiotherapist","مدير فروع":"Branch manager",
  "بصراحة من يوم ما اشتغلنا ببرايم فيزيو واللخبطة في المواعيد اختفت خالص، والعيادة بقت ماشية زي الساعة. أريح سيستم اتعاملت معاه!":"Since we started using Prime Physio, appointment chaos has disappeared and the clinic runs like clockwork. It’s the easiest system I’ve ever used!",
  "البرنامج خفيف ومخدش مني يومين عشان أتعود عليه. ورسايل الواتس آب اللي بتتبعت للمرضى ريحتني من وجع الدماغ بتاع تأكيد المواعيد كل يوم.":"The software is easy to learn. WhatsApp reminders have saved me the daily hassle of confirming appointments with patients.",
  "أكتر حاجة عجباني هي الـ Body Chart، بطلع ملف العيان وأسجل كل حاجة في الجلسة في ثواني. وفر عليا وقت ومجهود كبير جداً بصراحة.":"My favorite feature is the Body Chart. I can open a patient record and document the session in seconds. It saves me a lot of time and effort.",
  "عشان ماسك كذا فرع، كان موضوع التقارير ده كابوس. دلوقتي بفتح الموبايل وأنا في البيت أجيب كل الحسابات وجرد الفروع في تكّة واحدة.":"Managing reports across several branches used to be a nightmare. Now I can check all accounts and branch inventories from my phone in one go.",
  "تسجيل الجلسة في 30 ثانية":"Document a session in 30 seconds","تحكم كامل في 5 فروع":"Full control of 5 branches",
  "كيف ضاعف مركز Elite Physio أرباحه في 3 أشهر؟ (duplicate)":"How did Elite Physio double its profits in three months?",
  "قبل برايم فيزيو، كانت الإدارة الورقية والجدولة اليدوية بتضيع وقتنا كله. دلوقتي النظام الديجيتال وفر علينا مجهود ضخم، وقدرنا نركز أكتر على جودة الجلسات واستيعاب عدد أكبر من المرضى يومياً.":"Before Prime Physio, paperwork and manual scheduling took up all our time. The digital system has saved us significant effort, allowing us to focus on session quality and serve more patients each day.",
  "وفرنا 30% من وقت الاستقبال (duplicate)":"Saved 30% of reception time",
  "د. أحمد سلامة":"Dr. Ahmed Salama","د. أحمد كمال":"Dr. Ahmed Kamal","سارة محمد":"Sarah Mohamed","د. عمر حسين":"Dr. Omar Hussein","م. خالد يوسف":"Eng. Khaled Youssef",
  "نظام ادارة متكامل لمراكز العلاج الطبيعي":"An integrated management system for physiotherapy clinics",
  "نظام ادارة متكامل":"An integrated management system",
  "نظام إدارة متكامل لمراكز العلاج الطبيعي":"An integrated management system for physiotherapy clinics",
  "منظومة ادارة متكاملة":"An integrated clinic management system",
  "أسعار شفافة وبسيطة":"Clear and simple pricing",
  "اختر الباقة التي تناسب حجم وطموح مركزك. يمكنك الترقية أو الإلغاء في أي وقت.":"Choose the plan that fits your clinic. Upgrade or cancel at any time.",
  "شهري":"Monthly", "سنوي":"Yearly", "سنوياً":"per year", "شهرياً":"per month", "خصم 20% 🚀":"20% off 🚀", "الأكثر طلباً":"Most popular",
  "الأساسية (Starter)":"Starter", "الفضية (Silver)":"Silver", "الذهبية (Gold)":"Gold",
  "مثالية للعيادات الصغيرة والناشئة.":"Ideal for small and new clinics.",
  "للمراكز المتنامية التي تحتاج لأدوات احترافية.":"For growing clinics that need professional tools.",
  "للمستشفيات وسلاسل المراكز المتعددة.":"For hospitals and multi-location clinic groups.",
  "ج.م / سنوياً":"EGP / year", "ج.م / شهرياً":"EGP / month",
  "إدارة حتى 50 مريض":"Manage up to 50 patients", "100 جلسة شهرياً":"100 sessions per month", "20 حساب للأخصائيين":"20 therapist accounts", "إدارة مركز واحد":"Manage one clinic", "دعم فني عبر البريد":"Email support",
  "إدارة حتى 200 مريض":"Manage up to 200 patients", "500 جلسة شهرياً":"500 sessions per month", "50 حساب للأخصائيين":"50 therapist accounts", "التقارير والتحليلات والتغذية العلاجية":"Reports, analytics, and clinical nutrition", "دعم فني هاتفي":"Phone support",
  "عدد لا محدود من المرضى والجلسات":"Unlimited patients and sessions", "حسابات غير محدودة للأخصائيين":"Unlimited therapist accounts", "المكتبة العلاجية ورسائل التذكير":"Clinical library and reminders", "إدارة فروع متعددة (حتى مركزين)":"Manage multiple branches (up to two clinics)", "دعم VIP على مدار الساعة":"24/7 VIP support",
  "ابدأ مجانًا":"Start for free", "ابدأ الإصدار الفضي":"Choose Silver", "ابدأ الإصدار الذهبي":"Choose Gold", "ابدأ الإصدار المميز":"Choose Premium", "اشترك الآن":"Subscribe now",
  "غرفة":"Room",
};

function replaceWholePhrase(source: string, phrase: string, replacement: string) {
  let result = source;
  let from = 0;
  while (phrase.length > 0) {
    const index = result.indexOf(phrase, from);
    if (index < 0) break;
    const before = index > 0 ? result[index - 1] : "";
    const afterIndex = index + phrase.length;
    const after = afterIndex < result.length ? result[afterIndex] : "";
    const isArabic = (char: string) => /[\u0600-\u06FF]/.test(char);
    if (!isArabic(before) && !isArabic(after)) {
      result = result.slice(0, index) + replacement + result.slice(afterIndex);
      from = index + replacement.length;
    } else {
      from = index + phrase.length;
    }
  }
  return result;
}

function translateText(value: string, language: "ar" | "en") {
  const entries = Object.entries(copy);
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (language === "ar") {
    const reverse = new Map(entries.map(([ar, en]) => [en, ar]));
    const exact = reverse.get(trimmed);
    if (exact) return value.replace(trimmed, exact);
    return [...reverse.entries()]
      .sort((a, b) => b[0].length - a[0].length)
      .reduce((text, [en, ar]) => replaceWholePhrase(text, en, ar), value);
  }
  const exact = copy[trimmed];
  if (exact) return value.replace(trimmed, exact);
  return entries
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [ar, en]) => replaceWholePhrase(text, ar, en), value);
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
