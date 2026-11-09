"use client";

import React from "react";
import Link from "next/link";
import { FileText, ShieldCheck, User, Database, CreditCard } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

const sections = [
  {
    icon: User,
    titleAr: "1. نطاق الاتفاقية وقبولها",
    titleEn: "1. Scope and Acceptance",
    bodyAr: "تنظم هذه الشروط استخدام موقع Prime Physio ومنصة إدارة العيادات والحسابات ومساحات العمل والميزات المرتبطة بها (ويشار إليها مجتمعة باسم «الخدمة»). بإنشاء حساب أو استخدام الخدمة، فإنك تقر بأنك قرأت هذه الشروط وسياسة الخصوصية وتوافق عليهما. إذا كنت تنشئ الحساب نيابة عن عيادة أو مؤسسة، فإنك تقر بأن لديك الصلاحية اللازمة لتمثيلها.",
    bodyEn: "These Terms govern your use of the Prime Physio website, clinic-management platform, accounts, workspaces, and related features (together, the “Service”). By creating an account or using the Service, you confirm that you have read and agree to these Terms and the Privacy Policy. If you create an account for a clinic or organization, you confirm that you are authorized to represent it.",
    bulletsAr: ["تُعد الموافقة على الشروط وسياسة الخصوصية شرطًا لإنشاء حساب مالك جديد.", "تُطبق النسخة المنشورة وقت الموافقة، مع مراعاة الإخطارات والموافقات المطلوبة عند تحديثها."],
    bulletsEn: ["Acceptance of these Terms and the Privacy Policy is required to create a new owner account.", "The version published at the time of acceptance applies, subject to any notice or renewed consent required for later changes."]
  },
  {
    icon: User,
    titleAr: "2. الحساب والتسجيل والأمان",
    titleEn: "2. Account, Registration, and Security",
    bodyAr: "يجب تقديم بيانات صحيحة وحديثة عند التسجيل والمحافظة على تحديثها. قد يتطلب إنشاء الحساب التحقق من البريد الإلكتروني. أنت مسؤول عن سرية كلمة المرور وعن الأنشطة التي تتم من خلال حسابك، وعن إدارة صلاحيات العاملين وإلغاء وصول من لم يعد مخولًا باستخدام المنصة.",
    bodyEn: "You must provide accurate, current registration information and keep it updated. Account creation may require email verification. You are responsible for keeping your password confidential, activities carried out through your account, managing staff permissions, and removing access for people who are no longer authorized.",
    bulletsAr: ["لا تشارك بيانات الدخول أو تستخدم حساب شخص آخر.", "أبلغنا عبر صفحة الدعم فور الاشتباه في دخول غير مصرح به.", "يجوز لنا طلب معلومات إضافية للتحقق من الحساب أو حماية الخدمة."],
    bulletsEn: ["Do not share login credentials or use another person's account.", "Contact us through the Support page promptly if you suspect unauthorized access.", "We may request additional information to verify an account or protect the Service."]
  },
  {
    icon: Database,
    titleAr: "3. بيانات العيادة والمرضى",
    titleEn: "3. Clinic and Patient Data",
    bodyAr: "تظل البيانات التي تدخلها العيادة أو مستخدموها في الخدمة، بما في ذلك بيانات المرضى والحالات والجلسات والتقييمات والتقارير والمدفوعات والعاملين والملفات، خاضعة لحقوق ومسؤوليات العيادة وفق القانون. وبالنسبة إلى بيانات المرضى والعاملين التي تحدد العيادة أغراض ووسائل معالجتها، تكون العيادة هي المتحكم في البيانات وتعمل Prime Physio كمقدم خدمة/معالج بالقدر اللازم لتشغيل الخدمة ووفق التعليمات المشروعة للعيادة.",
    bodyEn: "Information entered by a clinic or its users—including patient and case details, sessions, evaluations, reports, payments, staff records, and files—remains subject to the clinic's rights and responsibilities under applicable law. For patient and staff data whose purposes and means of processing are determined by the clinic, the clinic acts as controller and Prime Physio acts as a service provider/processor to the extent necessary to operate the Service and follow the clinic's lawful instructions.",
    bulletsAr: ["تتحمل العيادة مسؤولية وجود أساس قانوني لجمع البيانات وإدخالها، والحصول على الموافقات اللازمة، بما في ذلك الموافقات المتعلقة بالبيانات الصحية أو بيانات القُصّر عند الاقتضاء.", "تتحمل العيادة مسؤولية دقة البيانات وصلاحيات المستخدمين والاستجابة لطلبات أصحاب البيانات التي تقع ضمن سيطرتها.", "لا يجوز إدخال بيانات لا تملك العيادة حق جمعها أو مشاركتها أو معالجتها."],
    bulletsEn: ["The clinic is responsible for having a lawful basis to collect and enter data and obtaining required permissions, including those relating to health data or minors where applicable.", "The clinic is responsible for data accuracy, user permissions, and responding to data-subject requests within its control.", "You must not enter data that the clinic is not authorized to collect, share, or process."]
  },
  {
    icon: ShieldCheck,
    titleAr: "4. استخدام الخدمة والاستخدام المقبول",
    titleEn: "4. Use of the Service and Acceptable Use",
    bodyAr: "تُستخدم الخدمة لأغراض إدارة وتشغيل أنشطة العيادات ومقدمي خدمات العلاج الطبيعي والتأهيل، وبما يتفق مع القوانين واللوائح المعمول بها. لا تحل المنصة محل الحكم المهني المستقل أو التقييم السريري أو مسؤولية مقدم الرعاية الصحية.",
    bodyEn: "The Service is intended to support the administration and operation of clinics and physical therapy or rehabilitation providers, in compliance with applicable laws. The platform does not replace independent professional judgment, clinical assessment, or the responsibilities of healthcare providers.",
    bulletsAr: ["يُحظر محاولة الوصول إلى بيانات حسابات أو عيادات أخرى دون تصريح.", "يُحظر تعطيل الخدمة أو اختبارها أمنيًا دون إذن أو تجاوز حدود الباقة والصلاحيات.", "يُحظر رفع برمجيات ضارة أو محتوى غير قانوني أو محتوى لا تملك حق استخدامه.", "يُحظر نسخ الخدمة أو إعادة بيعها أو تأجيرها أو استغلالها خارج نطاق الاستخدام المصرح به."],
    bulletsEn: ["Do not attempt to access another account's or clinic's data without authorization.", "Do not disrupt the Service, conduct unauthorized security testing, or bypass plan limits and permissions.", "Do not upload malware, unlawful content, or content you have no right to use.", "Do not copy, resell, rent, or exploit the Service outside the permitted scope."]
  },
  {
    icon: CreditCard,
    titleAr: "5. الباقات والرسوم والمدفوعات",
    titleEn: "5. Plans, Fees, and Payments",
    bodyAr: "تُعرض تفاصيل الباقات والأسعار والحدود والميزات في صفحة الباقات أو داخل الحساب، وتُطبق التفاصيل التي يختارها العميل عند الاشتراك. لا يجوز افتراض تفعيل ميزة مدفوعة أو إضافة رسوم غير موضحة قبل موافقة العميل وإتمام الإجراء المطلوب. وتخضع وسائل الدفع ومواعيد الاستحقاق وأي شروط استرداد لما يظهر بوضوح أثناء عملية الاشتراك أو في اتفاق مكتوب منفصل، مع عدم الإخلال بالحقوق التي يقررها القانون.",
    bodyEn: "Plan details, prices, limits, and features are shown on the Plans page or within the account. The details selected by the customer at subscription apply. A paid feature or additional fee will not be treated as accepted unless it is clearly disclosed and the customer takes the required action. Payment methods, due dates, and any refund terms are those clearly presented during checkout or in a separate written agreement, without limiting rights provided by law.",
    bulletsAr: ["راجع الباقة وحدود الاستخدام قبل تأكيد الاشتراك.", "أنت مسؤول عن صحة بيانات الدفع المقدمة إلى مزود الدفع.", "أي تغيير جوهري في السعر أو الباقة يخضع للإخطار أو الموافقة حيثما يلزم."],
    bulletsEn: ["Review the plan and usage limits before confirming a subscription.", "You are responsible for the accuracy of payment details submitted to a payment provider.", "Material changes to pricing or plans are subject to notice or consent where required."]
  },
  {
    icon: Database,
    titleAr: "6. السرية والأمان ومقدمو الخدمات",
    titleEn: "6. Confidentiality, Security, and Service Providers",
    bodyAr: "نتخذ تدابير تقنية وتنظيمية مناسبة لحماية المعلومات، ونقصر الوصول إلى البيانات على ما يلزم لتشغيل الخدمة والدعم والصيانة والأمان. وقد نستعين بمقدمي خدمات للاستضافة وقواعد البيانات والبريد الإلكتروني والتحليلات أو الدفع بحسب الميزات المستخدمة، ويقتصر دورهم على تقديم الخدمات المطلوبة وفق الترتيبات المعمول بها.",
    bodyEn: "We use appropriate technical and organizational measures to protect information and limit access to what is needed for service operation, support, maintenance, and security. Depending on the features used, we may rely on providers for hosting, databases, email, analytics, or payments; their role is limited to providing the relevant services under applicable arrangements.",
    bulletsAr: ["لا توجد وسيلة إلكترونية يمكن ضمان أمنها بصورة مطلقة.", "إذا علمنا بواقعة أمنية تستوجب الإخطار، سنتعامل معها وفق المتطلبات القانونية واجبة التطبيق."],
    bulletsEn: ["No electronic method can be guaranteed to be completely secure.", "If we become aware of a security incident requiring notification, we will handle it under applicable legal requirements."]
  },
  {
    icon: FileText,
    titleAr: "7. الملكية الفكرية",
    titleEn: "7. Intellectual Property",
    bodyAr: "تظل حقوق الملكية الفكرية المتعلقة بالمنصة وتصميمها وبرمجياتها وعلاماتها ومحتواها مملوكة لأصحابها. ويُمنح العميل حق استخدام محدودًا وغير حصري وغير قابل للتحويل للخدمة طوال فترة إتاحة الحساب ووفق هذه الشروط. ولا تنتقل ملكية بيانات العيادة إلى Prime Physio لمجرد استخدام الخدمة.",
    bodyEn: "Intellectual property rights in the platform, its design, software, brands, and content remain with their respective owners. The customer receives a limited, non-exclusive, non-transferable right to use the Service while the account is available and subject to these Terms. Use of the Service does not transfer ownership of clinic data to Prime Physio.",
    bulletsAr: [],
    bulletsEn: []
  },
  {
    icon: Database,
    titleAr: "8. الإلغاء والاحتفاظ بالبيانات والتصدير",
    titleEn: "8. Cancellation, Data Retention, and Export",
    bodyAr: "يمكن للعميل التوقف عن استخدام الخدمة وطلب إغلاق الحساب من خلال قنوات الدعم المتاحة. تتم معالجة طلبات التصدير أو الحذف وفق الأدوات المتاحة والالتزامات القانونية والفنية وسياسة الخصوصية. وقد نحتفظ ببعض السجلات للمدة اللازمة للامتثال للقانون أو تسوية النزاعات أو حماية أمن الخدمة، كما قد تبقى نسخ احتياطية لفترة محدودة وفق دورة النسخ والحذف الفنية.",
    bodyEn: "Customers may stop using the Service and request account closure through the available support channels. Export and deletion requests are handled according to available tools, legal and technical requirements, and the Privacy Policy. We may retain certain records as necessary to comply with law, resolve disputes, or protect the Service, and backups may remain for a limited period under technical backup and deletion cycles.",
    bulletsAr: ["حذف حساب الدخول لا يعني بالضرورة حذف السجلات التي تلتزم العيادة بالاحتفاظ بها.", "على العيادة تصدير البيانات التي تحتاج إليها قبل إغلاق الحساب متى كانت أدوات التصدير متاحة.", "توضح سياسة الخصوصية أغراض الاحتفاظ وحقوق طلب الوصول أو التصحيح أو الحذف."],
    bulletsEn: ["Deleting a login account does not necessarily delete records the clinic is legally required to retain.", "Clinics should export data they need before account closure where export tools are available.", "The Privacy Policy explains retention purposes and rights to request access, correction, or deletion."]
  },
  {
    icon: ShieldCheck,
    titleAr: "9. إتاحة الخدمة والتحديثات",
    titleEn: "9. Service Availability and Updates",
    bodyAr: "نسعى إلى تشغيل الخدمة بصورة مستقرة، لكن قد يحدث توقف مؤقت بسبب الصيانة أو التحديثات أو أعطال مزودي الخدمات أو ظروف خارجة عن السيطرة. وقد نضيف ميزات أو نعدلها أو نوقف أجزاء منها لأسباب تشغيلية أو أمنية أو قانونية. وسنقدم الإخطارات المطلوبة عند إجراء تغييرات جوهرية وفق القانون.",
    bodyEn: "We aim to operate the Service reliably, but temporary interruptions may occur due to maintenance, updates, provider outages, or circumstances beyond our control. We may add, modify, or discontinue features for operational, security, or legal reasons. We will provide notices required by law for material changes.",
    bulletsAr: [],
    bulletsEn: []
  },
  {
    icon: ShieldCheck,
    titleAr: "10. تعليق الحساب أو إنهاؤه",
    titleEn: "10. Suspension or Termination",
    bodyAr: "يجوز تقييد الوصول أو تعليق الحساب عند الاشتباه في استخدام غير مشروع أو تهديد أمني أو مخالفة جوهرية لهذه الشروط أو عدم سداد رسوم مستحقة، وذلك بالقدر اللازم والمتناسب ومع الإخطار متى كان ذلك ممكنًا أو مطلوبًا قانونًا. ولا يؤثر الإنهاء على الحقوق والالتزامات التي نشأت قبل تاريخ الإنهاء.",
    bodyEn: "We may restrict access or suspend an account where we reasonably suspect unlawful use, a security threat, a material breach of these Terms, or unpaid fees, to the extent necessary and proportionate and with notice where feasible or legally required. Termination does not affect rights and obligations accrued before termination.",
    bulletsAr: [],
    bulletsEn: []
  },
  {
    icon: ShieldCheck,
    titleAr: "11. القانون الواجب التطبيق وتسوية النزاعات",
    titleEn: "11. Governing Law and Disputes",
    bodyAr: "تُفسر هذه الشروط وتُطبق وفق قوانين جمهورية مصر العربية، مع مراعاة قواعد الاختصاص القضائي الإلزامية وأي حقوق لا يجوز التنازل عنها بموجب القانون. ويسعى الطرفان أولًا إلى حل أي خلاف متعلق بالخدمة وديًا عبر قنوات التواصل والدعم قبل اتخاذ الإجراءات القانونية.",
    bodyEn: "These Terms are interpreted and governed by the laws of the Arab Republic of Egypt, subject to mandatory jurisdiction rules and any rights that cannot be waived by law. The parties will first seek to resolve Service-related disputes amicably through the available support channels before taking legal action.",
    bulletsAr: [],
    bulletsEn: []
  },
  {
    icon: FileText,
    titleAr: "12. تحديث الشروط والتواصل",
    titleEn: "12. Changes and Contact",
    bodyAr: "قد نحدّث هذه الشروط لتعكس تطور الخدمة أو المتطلبات القانونية. سننشر النسخة الجديدة ورقمها أو تاريخ سريانها على هذه الصفحة، ونخطر أصحاب الحسابات بالتغييرات الجوهرية ونطلب موافقة جديدة عندما يتطلب القانون ذلك. للاستفسارات وطلبات الدعم والخصوصية، استخدم صفحة الدعم في Prime Physio.",
    bodyEn: "We may update these Terms to reflect changes to the Service or legal requirements. We will publish the new version and its version number or effective date on this page, notify account owners of material changes, and request renewed consent where required by law. For enquiries, support, or privacy requests, use the Prime Physio Support page.",
    bulletsAr: [],
    bulletsEn: []
  }
];

export default function TermsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <article className="mx-auto max-w-4xl" dir={isRtl ? "rtl" : "ltr"}>
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#4F46BA]/10 px-3 py-1.5 text-xs font-semibold text-[#4F46BA]">
            <FileText className="h-4 w-4" />
            {isRtl ? "اتفاقية استخدام المنصة" : "Platform Use Agreement"}
          </div>
          <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{isRtl ? "شروط الاستخدام" : "Terms of Use"}</h1>
          <p className="mx-auto max-w-3xl text-sm leading-8 text-slate-500">
            {isRtl ? "توضح هذه الشروط قواعد إنشاء حساب Prime Physio واستخدام المنصة ومسؤوليات مالك الحساب والعيادة." : "These Terms explain the rules for creating a Prime Physio account, using the platform, and the responsibilities of account owners and clinics."}
          </p>
          <p className="mt-4 text-xs text-slate-400">{isRtl ? "الإصدار 1.0 · تاريخ السريان: 9 نوفمبر 2026" : "Version 1.0 · Effective: November 9, 2026"}</p>
        </header>
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-7 text-amber-900 sm:p-5 sm:text-sm">
          {isRtl ? "تنبيه: هذه صياغة تشغيلية أولية مخصصة لطبيعة Prime Physio. يجب مراجعتها قانونيًا قبل اعتمادها النهائي، والتأكد من مطابقتها لممارسات المنصة الفعلية ومزودي الخدمات." : "Notice: These are preliminary operational terms tailored to Prime Physio. They should be reviewed by qualified counsel and checked against the platform's actual practices and service providers before final adoption."}
        </div>
        <div className="space-y-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const title = isRtl ? section.titleAr : section.titleEn;
            const body = isRtl ? section.bodyAr : section.bodyEn;
            const bullets = isRtl ? section.bulletsAr : section.bulletsEn;
            return (
              <section key={index} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4F46BA]/10 text-[#4F46BA]"><Icon className="h-5 w-5" /></div>
                  <h2 className="text-base font-bold text-slate-800 sm:text-lg">{title}</h2>
                </div>
                <p className="text-sm leading-8 text-slate-600">{body}</p>
                {bullets.length > 0 && <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-8 text-slate-600">{bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}
              </section>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href="/privacy" className="font-semibold text-[#5146B8] underline underline-offset-4">{isRtl ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
          <Link href="/support" className="font-semibold text-[#5146B8] underline underline-offset-4">{isRtl ? "الدعم والتواصل" : "Support"}</Link>
        </div>
      </article>
    </PublicLayout>
  );
}
