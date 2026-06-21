"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { signOut } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";

export default function AccountDeletionPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const isRtl = language === "ar";
  
  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    
    const confirmed = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من أنك تريد حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه."
        : "Are you sure you want to delete your account? This action cannot be undone."
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        setAppValue("current_user", null).catch(() => {});
        signOut({ callbackUrl: "/login?deleted=true" });
      } else {
        const error = await response.json();
        alert(language === "ar" ? `فشل حذف الحساب: ${error.error}` : `Failed to delete account: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(language === "ar" ? "حدث خطأ أثناء محاولة حذف الحساب" : "An error occurred while trying to delete your account");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-red-800 mb-2">
          {language === "ar" ? "حذف الحساب" : "Delete Account"}
        </h2>
        <p className="text-sm text-red-700 mb-4">
          {language === "ar"
            ? "حذف حسابك سيؤدي إلى إزالة جميع بياناتك بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
            : "Deleting your account will permanently remove all your data. This action cannot be undone."
          }
        </p>
        
        <div className="bg-white rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">
            {language === "ar" ? "سيتم حذف:" : "Will be deleted:"}
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• {language === "ar" ? "جميع بيانات العيادة" : "All clinic data"}</li>
            <li>• {language === "ar" ? "سجلات المرضى" : "Patient records"}</li>
            <li>• {language === "ar" ? "المواعيد والجلسات" : "Appointments and sessions"}</li>
            <li>• {language === "ar" ? "الفواتير والمدفوعات" : "Invoices and payments"}</li>
            <li>• {language === "ar" ? "إعدادات العيادة" : "Clinic settings"}</li>
            <li>• {language === "ar" ? "سجلات الموظفين" : "Staff records"}</li>
            <li>• {language === "ar" ? "الحساب الشخصي" : "Personal account"}</li>
          </ul>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting
              ? (language === "ar" ? "جارِ الحذف..." : "Deleting...")
              : (language === "ar" ? "تأكيد حذف الحساب" : "Confirm Account Deletion")
            }
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isDeleting}
          >
            {language === "ar" ? "العودة" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}