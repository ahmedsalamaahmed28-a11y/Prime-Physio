"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, LockKeyhole, Database, UserRound, Cookie, FileText } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

const sections = [
  {
    icon: Database,
    titleAr: "1. المعلومات التي نجمعها",
    titleEn: "1. Information We Collect",
    introAr: "قد نجمع المعلومات التالية بحسب طريقة استخدامك للمنصة والخدمات التي يفعّلها مركزك:",
    introEn: "Depending on how you use the platform and which features your clinic enables, we may collect:",
    itemsAr: [
      "بيانات الحساب والتواصل: الاسم، البريد الإلكتروني، رقم الهاتف، وبيانات تسجيل الدخول اللازمة لإنشاء الحساب وإدارته.",
      "بيانات العيادة: اسم المركز وفروعه وعنوانه وبيانات العاملين والأدوار والصلاحيات والاشتراك.",
      "بيانات المرضى والسجلات الصحية: البيانات التعريفية وبيانات التواصل والتاريخ المرضي والتقييمات والتشخيصات والخطط العلاجية وملاحظات الجلسات والتقارير التي يُدخلها المركز.",
      "بيانات التشغيل والمعاملات: المواعيد والحجوزات والفواتير والمدفوعات والمستحقات وسجلات الاستخدام والدعم الفني.",
      "البيانات التقنية: عنوان IP ومعلومات الجهاز والمتصفح ونظام التشغيل وسجلات الأخطاء ووقت الدخول وملفات تعريف الارتباط أو تقنيات مشابهة عند استخدامها.",
      "المراسلات: المعلومات التي ترسلها إلينا عند طلب الدعم أو التواصل معنا."
    ],
    itemsEn: [
      "Account and contact details: name, email address, phone number, and credentials needed to create and manage an account.",
      "Clinic information: clinic and branch names, addresses, staff details, roles, permissions, and subscription information.",
      "Patient and health records: identity and contact details, medical history, assessments, diagnoses, treatment plans, session notes, and reports entered by the clinic.",
      "Operational and transaction data: appointments, bookings, invoices, payments, balances, usage records, and support requests.",
      "Technical data: IP address, device and browser information, operating system, error logs, login timestamps, and cookies or similar technologies where used.",
      "Communications: information you provide when contacting support or communicating with us."
    ]
  },
  {
    icon: FileText,
    titleAr: "2. كيف نستخدم المعلومات",
    titleEn: "2. How We Use Information",
    introAr: "نستخدم المعلومات بالقدر اللازم لتشغيل Prime Physio وتقديم خدماتها، ومن ذلك:",
    introEn: "We use information as necessary to operate Prime Physio and provide its services, including to:",
    itemsAr: [
      "إنشاء الحسابات والتحقق منها وإدارة صلاحيات المستخدمين والفروع.",
      "تشغيل وظائف إدارة المرضى والمواعيد والجلسات والملفات والتقارير والفواتير.",
      "معالجة الاشتراكات والمدفوعات وإدارة الفواتير والمستحقات عند تفعيل هذه الخدمات.",
      "تقديم الدعم الفني والرد على الاستفسارات وإرسال الإشعارات التشغيلية والأمنية.",
      "حماية المنصة واكتشاف إساءة الاستخدام والاحتيال ومحاولات الدخول غير المصرح بها.",
      "تحسين الأداء وإصلاح الأعطال وتطوير الميزات وفهم كيفية استخدام المنصة.",
      "الامتثال للالتزامات القانونية وحماية الحقوق والمصالح المشروعة."
    ],
    itemsEn: [
      "Create and verify accounts and manage user and branch permissions.",
      "Operate patient, appointment, session, record, reporting, and billing features.",
      "Process subscriptions and payments and manage invoices and balances where enabled.",
      "Provide technical support, respond to enquiries, and send operational and security notices.",
      "Protect the platform and detect misuse, fraud, and unauthorized access attempts.",
      "Improve performance, fix errors, develop features, and understand platform usage.",
      "Comply with legal obligations and protect rights and legitimate interests."
    ]
  },
  {
    icon: UserRound,
    titleAr: "3. مسؤولية العيادة عن بيانات المرضى",
    titleEn: "3. Clinic Responsibility for Patient Data",
    introAr: "عند استخدام العيادة للمنصة لإدخال بيانات المرضى، تظل العيادة أو الجهة التي تقرر كيفية استخدام هذه البيانات مسؤولة عن تحديد الغرض والأساس القانوني لجمعها واستخدامها، وعن الحصول على الموافقات أو الأذونات اللازمة وإبلاغ المرضى بحقوقهم. وتعمل Prime Physio، بحسب طبيعة الخدمة والتعليمات المتفق عليها، كمقدم خدمة يعالج هذه البيانات نيابة عن العيادة.",
    introEn: "When a clinic enters patient information into the platform, the clinic or organization deciding why and how that information is used remains responsible for determining the purpose and lawful basis for collection and use, obtaining required permissions or consents, and informing patients of their rights. Depending on the service and agreed instructions, Prime Physio acts as a service provider processing that information on the clinic's behalf.",
    itemsAr: [
      "يجب ألا تُدخل العيادة بيانات إلا إذا كان لديها أساس قانوني وصلاحية مناسبة لذلك.",
      "يجب قصر الوصول إلى ملفات المرضى على العاملين المخولين وبالقدر اللازم لأداء مهامهم.",
      "تتحمل العيادة مسؤولية صحة البيانات التي تدخلها، وتحديثها، والاستجابة لطلبات أصحاب البيانات المتعلقة بها.",
      "لا يجوز استخدام المنصة لإدخال بيانات لا تملك العيادة حق معالجتها أو مشاركتها."
    ],
    itemsEn: [
      "A clinic must only enter data where it has an appropriate lawful basis and authority to do so.",
      "Access to patient records should be limited to authorized personnel who need it for their duties.",
      "The clinic is responsible for the accuracy and updating of the information it enters and for responding to data-subject requests relating to it.",
      "The platform must not be used to enter information the clinic is not authorized to process or share."
    ]
  },
  {
    icon: LockKeyhole,
    titleAr: "4. مشاركة المعلومات والإفصاح عنها",
    titleEn: "4. Sharing and Disclosure",
    introAr: "لا نبيع المعلومات الشخصية ولا نؤجرها. وقد تتم مشاركتها في الحدود الضرورية في الحالات التالية:",
    introEn: "We do not sell or rent personal information. We may share it only as necessary in the following circumstances:",
    itemsAr: [
      "مع مزودي الخدمات التقنية الذين يساعدون في الاستضافة وتشغيل قواعد البيانات وإرسال البريد أو الإشعارات ومعالجة المدفوعات، وفقًا للأدوار والصلاحيات اللازمة.",
      "مع المستخدمين والعاملين الذين تمنحهم العيادة صلاحية الوصول داخل حسابها.",
      "عند وجود التزام قانوني أو أمر صادر من جهة مختصة، أو لحماية سلامة المستخدمين وحقوق المنصة.",
      "في حالة إعادة هيكلة النشاط أو نقل الخدمة، مع اتخاذ التدابير المناسبة لحماية البيانات وإخطار الأطراف المعنية حيثما يلزم."
    ],
    itemsEn: [
      "With technical service providers that support hosting, databases, email or notifications, and payment processing, limited to what they need to perform their services.",
      "With users and staff whom the clinic authorizes within its account.",
      "Where required by law or a competent authority, or to protect users' safety and the platform's rights.",
      "In connection with a business restructuring or service transfer, subject to appropriate safeguards and notices where required."
    ]
  },
  {
    icon: ShieldCheck,
    titleAr: "5. حماية المعلومات وأمنها",
    titleEn: "5. Information Security",
    introAr: "نتخذ تدابير إدارية وتقنية وتنظيمية مناسبة لحماية المعلومات من الوصول أو الاستخدام أو التعديل أو الإفصاح أو الإتلاف غير المصرح به. وقد تشمل هذه التدابير إدارة الصلاحيات، وضوابط الوصول، والاتصالات الآمنة، ومراجعة سجلات النشاط، وإجراءات النسخ الاحتياطي بحسب إعدادات الخدمة.",
    introEn: "We use appropriate administrative, technical, and organizational measures designed to protect information against unauthorized access, use, alteration, disclosure, or destruction. Measures may include permission management, access controls, secure communications, activity-log review, and backup procedures depending on the service configuration.",
    itemsAr: [
      "لا توجد وسيلة نقل أو تخزين إلكتروني يمكن ضمان أمنها بنسبة 100%؛ لذلك لا يمكن تقديم ضمان مطلق ضد جميع المخاطر.",
      "يجب على المستخدم الحفاظ على سرية كلمة المرور وعدم مشاركة بيانات الدخول، وإبلاغ إدارة المنصة فور الاشتباه في اختراق الحساب.",
      "إذا وقع خرق للبيانات يستوجب الإخطار، سنتعامل معه وفق المتطلبات القانونية واجبة التطبيق."
    ],
    itemsEn: [
      "No electronic transmission or storage method can be guaranteed to be 100% secure; therefore, absolute protection against every risk cannot be promised.",
      "Users must keep passwords confidential, avoid sharing login credentials, and promptly notify the platform if they suspect account compromise.",
      "If a data breach requires notification, we will handle it in accordance with applicable legal requirements."
    ]
  },
  {
    icon: Cookie,
    titleAr: "6. ملفات تعريف الارتباط والتقنيات المشابهة",
    titleEn: "6. Cookies and Similar Technologies",
    introAr: "قد تستخدم المنصة ملفات تعريف الارتباط أو تقنيات مشابهة لتشغيل الوظائف الأساسية، وتذكر تفضيلات اللغة أو الجلسة، وتحسين الأداء والأمان. ويمكنك التحكم في ملفات تعريف الارتباط من إعدادات المتصفح، مع العلم أن تعطيل بعض الملفات الضرورية قد يؤثر في عمل أجزاء من المنصة.",
    introEn: "The platform may use cookies or similar technologies to enable core functionality, remember language or session preferences, and improve performance and security. You can control cookies through your browser settings, but disabling essential cookies may affect parts of the platform.",
    itemsAr: [],
    itemsEn: []
  },
  {
    icon: Database,
    titleAr: "7. الاحتفاظ بالبيانات وحذفها",
    titleEn: "7. Data Retention and Deletion",
    introAr: "نحتفظ بالمعلومات للمدة اللازمة لتقديم الخدمة وتحقيق الأغراض الموضحة في هذه السياسة، أو للمدة التي يفرضها القانون أو تقتضيها الحاجة إلى حل النزاعات وحماية الحقوق. وتختلف مدة الاحتفاظ باختلاف نوع البيانات وإعدادات حساب العيادة والالتزامات القانونية.",
    introEn: "We retain information for as long as needed to provide the service and fulfill the purposes described in this policy, or for the period required by law or necessary to resolve disputes and protect rights. Retention periods vary depending on the type of information, clinic-account settings, and legal obligations.",
    itemsAr: [
      "يمكن للعيادة طلب تصدير أو حذف البيانات التي تديرها، مع مراعاة القيود القانونية والفنية والالتزامات المتعلقة بالاحتفاظ بالسجلات.",
      "قد تبقى نسخ احتياطية أو سجلات أمنية لفترة محدودة وفق دورة الاحتفاظ الفنية، ثم تُحذف أو تُعزل وفق الإجراءات المتبعة.",
      "حذف حساب المستخدم لا يعني بالضرورة حذف سجلات العيادة أو ملفات المرضى؛ يجب تنسيق طلبات هذه البيانات مع مسؤول العيادة.",
      "قد نحتفظ بقدر محدود من المعلومات إذا كان ذلك لازمًا للامتثال للقانون أو منع الاحتيال أو إثبات المعاملات أو حماية الحقوق."
    ],
    itemsEn: [
      "A clinic may request export or deletion of data it manages, subject to legal, technical, and record-retention requirements.",
      "Backups or security logs may remain for a limited period under technical retention cycles before deletion or isolation under applicable procedures.",
      "Deleting an individual user account does not necessarily delete clinic records or patient files; requests concerning those records should be coordinated with the clinic administrator.",
      "We may retain limited information where necessary to comply with law, prevent fraud, evidence transactions, or protect rights."
    ]
  },
  {
    icon: UserRound,
    titleAr: "8. حقوق أصحاب البيانات",
    titleEn: "8. Data Subject Rights",
    introAr: "وفقًا للقانون المصري لحماية البيانات الشخصية رقم 151 لسنة 2020 واللوائح والقرارات ذات الصلة، وبحسب صفة مقدم الطلب والأساس القانوني للمعالجة، قد تشمل الحقوق طلب:",
    introEn: "Under Egypt's Personal Data Protection Law No. 151 of 2020 and related regulations and decisions, and depending on the requester’s role and the legal basis for processing, rights may include requests to:",
    itemsAr: [
      "معرفة البيانات الشخصية التي تتم معالجتها والحصول على معلومات عنها.",
      "الوصول إلى البيانات أو الحصول على نسخة منها وفق الضوابط القانونية.",
      "تصحيح البيانات غير الدقيقة أو استكمال البيانات الناقصة.",
      "طلب المحو أو التقييد أو الاعتراض على المعالجة في الحالات التي يسمح بها القانون.",
      "سحب الموافقة عندما تكون الموافقة هي أساس المعالجة، دون أن يؤثر ذلك بالضرورة على مشروعية المعالجة السابقة.",
      "طلب نقل البيانات حيث ينطبق ذلك وتسمح به المتطلبات القانونية والفنية."
    ],
    itemsEn: [
      "Learn whether personal data is being processed and obtain information about that processing.",
      "Access personal data or obtain a copy, subject to legal requirements.",
      "Correct inaccurate information or complete incomplete information.",
      "Request erasure, restriction, or object to processing where the law permits.",
      "Withdraw consent where consent is the basis for processing, without necessarily affecting the lawfulness of prior processing.",
      "Request data portability where applicable and permitted by legal and technical requirements."
    ]
  },
  {
    icon: FileText,
    titleAr: "9. التسويق والرسائل وإلغاء الاشتراك",
    titleEn: "9. Marketing Communications and Opt-Out",
    introAr: "قد نرسل رسائل تشغيلية تتعلق بالحساب أو الاشتراك أو الأمان أو تحديثات الخدمة. أما الرسائل التسويقية أو الترويجية، فسنراعي بشأنها الموافقات والمتطلبات القانونية ذات الصلة. ويمكنك طلب إيقاف الرسائل التسويقية من خلال تعليمات إلغاء الاشتراك إن وجدت أو التواصل معنا عبر صفحة الدعم. إيقاف الرسائل التسويقية لا يمنع الرسائل الضرورية لتشغيل الخدمة أو حماية الحساب.",
    introEn: "We may send operational messages about accounts, subscriptions, security, or service updates. For marketing or promotional messages, we will follow applicable consent and legal requirements. You may opt out of marketing messages using the unsubscribe instructions, where available, or by contacting us through the support page. Opting out of marketing does not prevent essential service or account-security communications.",
    itemsAr: [],
    itemsEn: []
  },
  {
    icon: ShieldCheck,
    titleAr: "10. خدمات وروابط الجهات الخارجية",
    titleEn: "10. Third-Party Services and Links",
    introAr: "قد تعتمد بعض وظائف المنصة على خدمات يقدمها أطراف خارجية، مثل الاستضافة أو البريد الإلكتروني أو الدفع أو خدمات التكامل. تخضع معالجة البيانات لدى هذه الجهات لسياساتها وشروطها الخاصة، وننصح بمراجعتها. ولا نتحكم في مواقع الجهات الخارجية أو ممارسات الخصوصية الخاصة بها.",
    introEn: "Some platform features may rely on third-party services such as hosting, email, payment, or integration providers. Those providers process information under their own terms and privacy policies, which we encourage you to review. We do not control third-party websites or their privacy practices.",
    itemsAr: [],
    itemsEn: []
  },
  {
    icon: FileText,
    titleAr: "11. خصوصية الأطفال",
    titleEn: "11. Children's Privacy",
    introAr: "المنصة موجهة إلى العيادات ومقدمي الخدمات المهنية وليست مصممة ليستخدمها الأطفال لإنشاء حسابات مستقلة. وتتحمل العيادة مسؤولية التأكد من وجود الأساس القانوني والموافقات اللازمة قبل إدخال بيانات أي مريض قاصر، والتعامل معها وفق القوانين المعمول بها.",
    introEn: "The platform is intended for clinics and professional service providers and is not designed for children to create independent accounts. Clinics are responsible for ensuring an appropriate lawful basis and required permissions before entering information about a minor patient, and for handling that information in accordance with applicable law.",
    itemsAr: [],
    itemsEn: []
  },
  {
    icon: FileText,
    titleAr: "12. التعديلات على سياسة الخصوصية",
    titleEn: "12. Changes to This Privacy Policy",
    introAr: "قد نحدّث هذه السياسة من وقت لآخر لتعكس تغييرات الخدمة أو المتطلبات القانونية أو ممارسات معالجة البيانات. سننشر النسخة المحدثة على هذه الصفحة مع تعديل تاريخ آخر تحديث. ويُرجى مراجعة الصفحة دوريًا. وإذا تطلب القانون إخطارًا أو موافقة إضافية على تغيير جوهري، فسنتبع الإجراء المطلوب.",
    introEn: "We may update this policy from time to time to reflect changes to the service, legal requirements, or data-processing practices. The revised version will be posted on this page with an updated revision date. Please review it periodically. Where the law requires notice or additional consent for a material change, we will follow the required process.",
    itemsAr: [],
    itemsEn: []
  },
  {
    icon: UserRound,
    titleAr: "13. التواصل وطلبات الخصوصية",
    titleEn: "13. Contact and Privacy Requests",
    introAr: "للاستفسارات أو طلبات الوصول أو التصحيح أو الحذف أو الاعتراض المتعلقة ببيانات حسابك، تواصل معنا من خلال صفحة الدعم في Prime Physio. أما طلبات بيانات المرضى التي أدخلتها العيادة، فيُرجى توجيهها أولًا إلى مسؤول العيادة؛ وقد ننسق مع العيادة للمساعدة في تنفيذ الطلب وفق القانون.",
    introEn: "For enquiries or requests to access, correct, delete, or object to the processing of your account information, contact us through the Prime Physio support page. Requests concerning patient data entered by a clinic should first be directed to the clinic administrator; we may coordinate with the clinic to help process the request in accordance with law.",
    itemsAr: [],
    itemsEn: []
  }
];

export default function PrivacyPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <article className="max-w-4xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#4F46BA]/10 rounded-full text-[#4F46BA] text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            {isRtl ? "الخصوصية وحماية البيانات" : "Privacy & Data Protection"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 leading-8 max-w-3xl mx-auto">
            {isRtl
              ? "توضح هذه السياسة كيفية جمع واستخدام ومشاركة وحماية المعلومات عند زيارة موقع Prime Physio أو استخدام منصة إدارة العيادات وخدماتها."
              : "This policy explains how information is collected, used, shared, and protected when you visit Prime Physio or use its clinic-management platform and services."}
          </p>
          <p className="text-xs text-slate-400 mt-4">
            {isRtl ? "آخر تحديث: 6 نوفمبر 2026" : "Last updated: November 6, 2026"}
          </p>
        </header>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 sm:p-5 mb-8 text-xs sm:text-sm text-amber-900 leading-7">
          {isRtl
            ? "تنبيه مهم: هذه السياسة إطار معلوماتي عام، ويجب مراجعتها قانونيًا قبل اعتمادها نهائيًا، خصوصًا فيما يتعلق ببيانات المرضى الصحية، وأدوار مسؤول ومُعالج البيانات، ومزودي الخدمات الفعليين وإجراءات الاحتفاظ والحذف المعتمدة."
            : "Important: This is a general policy framework and should receive legal review before final adoption, especially regarding patient health data, controller/processor roles, actual service providers, and implemented retention and deletion procedures."}
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const title = isRtl ? section.titleAr : section.titleEn;
            const intro = isRtl ? section.introAr : section.introEn;
            const items = isRtl ? section.itemsAr : section.itemsEn;
            return (
              <section key={index} className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4F46BA]/10 text-[#4F46BA] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">{title}</h2>
                </div>
                <p className="text-sm text-slate-600 leading-8">{intro}</p>
                {items.length > 0 && (
                  <ul className="mt-3 space-y-2.5 list-disc ps-5 text-sm text-slate-600 leading-8">
                    {items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

      </article>
    </PublicLayout>
  );
}
