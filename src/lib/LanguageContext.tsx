"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAppValue, setAppValue } from "@/lib/appStorage";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Layout & Header
    "brand_title": "PRIME PHYSIO",
    "brand_subtitle": "إدارة العيادات",
    "search_placeholder": "ابحث عن مريض، هاتف...",
    "messages": "الرسائل",
    "notifications": "الإشعارات",
    "profile": "الملف الشخصي",
    "logout": "تسجيل الخروج",
    "lang_label": "ENG",
    "ar_label": "عربي",
    "main_clinic_title": "Prime Physio",
    "assistant_role": "مدير القسم الطبي",
    
    // Sidebar items
    "nav_admin": "إدارة المنصة",
    "nav_home": "الرئيسية",
    "nav_messages": "الرسائل والمحادثات",
    "nav_calendar": "المواعيد والتقويم",
    "nav_patients": "المرضى والجلسات",
    "nav_billing": "المالية والفواتير",
    "nav_clinic_settings": "التشغيل والإدارة",
    "nav_staff": "الموظفين",
    "nav_hr": "الموارد البشرية والرواتب",
    "nav_analytics": "التحليلات",
    "nav_nutrition": "التغذية العلاجية",
    "nav_library": "المكتبة العلاجية",
    "nav_permissions": "الصلاحيات",
    "nav_logout": "تسجيل الخروج",
    "nav_subscription": "خطط الاشتراك",
    "nav_section_title": "إدارة العيادات",

    // Home Dashboard
    "welcome": "👋 مرحبا بعودتك، Prime Physio",
    "dashboard": "لوحة التحكم",
    "dashboard_desc": "نظرة عامة على عيادة العلاج الطبيعي خاصتك",
    "daily_calendar": "التقويم اليومي",
    "patients_record": "سجل المرضى",
    "todays_patients": "مرضى اليوم",
    "todays_sessions": "جلسات اليوم",
    "completed_today": "المكتملة اليوم",
    "todays_income": "دخل اليوم",
    "todays_appointments": "مواعيد اليوم القادمة",
    "todays_appointments_desc": "قائمة الحالات المسجلة اليوم",
    "no_appointments": "لا توجد مواعيد اليوم",
    "start_session": "بدء الجلسة",
    
    // Patients Directory
    "patients_title": "سجل المرضى الشامل",
    "patients_subtitle": "البحث في دليل ملفات المرضى وإدارة ملفاتهم الطبية",
    "add_patient": "إضافة مريض جديد",
    "search_patient_placeholder": "ابحث باسم المريض، رقم الهوية أو الملف، أو رقم الجوال...",
    "all_cases": "جميع الحالات",
    "active": "نشط",
    "inactive": "غير نشط",
    "file_num": "رقم الملف",
    "patient_name": "اسم المريض",
    "phone_num": "رقم الهاتف",
    "demographics": "البيانات الديموغرافية",
    "current_package": "الباقة الحالية",
    "file_status": "حالة الملف",
    "medical_file": "الملف الطبي",
    "open_emr": "فتح EMR",
    
    // Doctors Page
    "doctors_title": "الطاقم الطبي والأطباء",
    "doctors_subtitle": "أطباء وأخصائيي العلاج الطبيعي والتأهيل بالمركز وجداول أعمالهم",
    "add_therapist": "إضافة معالج جديد",
    "active_patients": "المرضى النشطين",
    "today_sessions": "جلسات اليوم",
    "view_appointments": "عرض المواعيد",
    
    // Staff Page
    "staff_title": "فريق العمل الإداري",
    "staff_subtitle": "موظفي الاستقبال والمالية والتنسيق الإداري بالمركز",
    "add_staff": "إضافة موظف جديد",
    "staff_name": "الموظف",
    "staff_role": "المسمى الوظيفي",
    "staff_contact": "بيانات التواصل",
    "date_joined": "تاريخ الانضمام",
    "status": "الحالة",
    "edit_profile": "تعديل الملف",
    
    // Profile Page
    "profile_saved": "تم حفظ البيانات بنجاح!",
    "save_profile": "حفظ البيانات"
  },
  en: {
    // Layout & Header
    "brand_title": "PRIME PHYSIO",
    "brand_subtitle": "Clinic Management",
    "search_placeholder": "Search patient, phone...",
    "messages": "Messages",
    "notifications": "Notifications",
    "profile": "Profile Settings",
    "logout": "Logout",
    "lang_label": "عربي",
    "ar_label": "Arabic",
    "main_clinic_title": "Prime Physio",
    "assistant_role": "Medical Director",
    
    // Sidebar items
    "nav_admin": "Platform Admin",
    "nav_home": "Home",
    "nav_messages": "Messages & Chat",
    "nav_calendar": "Calendar & Appointments",
    "nav_patients": "Patients & Sessions",
    "nav_billing": "Billing & Invoices",
    "nav_clinic_settings": "Clinic Settings",
    "nav_staff": "Staff Members",
    "nav_hr": "HR & Payroll",
    "nav_analytics": "Analytics",
    "nav_nutrition": "Clinical Nutrition",
    "nav_library": "Clinical Library",
    "nav_permissions": "Permissions",
    "nav_logout": "Logout",
    "nav_subscription": "Subscription Plans",
    "nav_section_title": "Clinic Management",

    // Home Dashboard
    "welcome": "👋 Welcome back, Prime Physio",
    "dashboard": "Dashboard",
    "dashboard_desc": "Overview of your physical therapy clinic",
    "daily_calendar": "Daily Calendar",
    "patients_record": "Patients Record",
    "todays_patients": "Today's Patients",
    "todays_sessions": "Today's Sessions",
    "completed_today": "Completed Today",
    "todays_income": "Today's Income",
    "todays_appointments": "Today's Upcoming Appointments",
    "todays_appointments_desc": "List of cases scheduled for today",
    "no_appointments": "No appointments today",
    "start_session": "Start Session",
    
    // Patients Directory
    "patients_title": "Comprehensive Patients Record",
    "patients_subtitle": "Search directory and manage electronic medical records (EMR)",
    "add_patient": "Add New Patient",
    "search_patient_placeholder": "Search by patient name, file ID, or phone number...",
    "all_cases": "All Cases",
    "active": "Active",
    "inactive": "Inactive",
    "file_num": "File Number",
    "patient_name": "Patient Name",
    "phone_num": "Phone Number",
    "demographics": "Demographics",
    "current_package": "Current Package",
    "file_status": "File Status",
    "medical_file": "Medical Record",
    "open_emr": "Open EMR",
    
    // Doctors Page
    "doctors_title": "Medical Staff & Doctors",
    "doctors_subtitle": "Doctors, physical therapists and rehabilitation experts schedules",
    "add_therapist": "Add New Therapist",
    "active_patients": "Active Patients",
    "today_sessions": "Today's Sessions",
    "view_appointments": "View Schedule",
    
    // Staff Page
    "staff_title": "Administrative Staff",
    "staff_subtitle": "Receptionists, billing officers and administrative coordinators",
    "add_staff": "Add Staff Member",
    "staff_name": "Employee",
    "staff_role": "Role / Position",
    "staff_contact": "Contact Details",
    "date_joined": "Date Joined",
    "status": "Status",
    "edit_profile": "Edit File",
    
    // Profile Page
    "profile_saved": "Profile saved successfully!",
    "save_profile": "Save Profile Data"
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar");

  const pathname = usePathname();

  useEffect(() => {
    getAppValue<Language>("ui_language", "ar").then((savedLang) => {
      if (savedLang === "ar" || savedLang === "en") setLanguage(savedLang);
    });
  }, []);

  useEffect(() => {
    const updateTitle = () => {
      if (typeof document !== "undefined") {
        document.title = language === "ar" 
          ? "برايم فيزيو - للعلاج الطبيعي والتغذية العلاجية" 
          : "Prime Physio - Physical Therapy & Nutrition clinic";
      }
    };
    
    // Run immediately
    updateTitle();
    
    return undefined;
  }, [language, pathname]);

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    setAppValue("ui_language", newLang).catch((error) => {
      console.error("Failed to persist language preference", error);
    });
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

