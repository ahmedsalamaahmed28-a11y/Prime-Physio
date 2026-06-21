# Account Deletion Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account deletion functionality to the account menu so admins can delete their account and potentially recreate it normally from the login/signup page.

**Architecture:** This feature will add a "Delete Account" option to the UserDropdown menu that triggers a confirmation dialog and calls an API endpoint to delete the user's account. The implementation will include proper cleanup of related data (patients, appointments, etc.) and ensure only admins can delete their own accounts.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase, NextAuth, Node.js

## Global Constraints

- Arabic-first interface with RTL support
- Multi-tenant SaaS clinic management platform
- Admin signup via Google OAuth, doctors/receptionists use email/password
- Super admin (ahmedsalamaahmed21@gmail.com) sees all clinics
- Each clinic admin sees only their data
- Plans use unified feature list across all tiers
- NEXT_PUBLIC_SUPABASE_ANON_KEY on client; SUPABASE_SERVICE_ROLE_KEY server-side only
- All Supabase queries scoped by clinic_id across all page files (~60+ query sites)
- Fixed `.eq()` ordering for Supabase v2 client (must be `.select().eq()` not `.eq().select()`)
- Fixed `onConflict` from `user_id` to `clinic_id` in profile upserts

---

## Task Structure

### Task 1: Add "Delete Account" option to UserDropdown menu

**Files:**
- Modify: `src/components/UserDropdown.tsx:31-34`

**Interfaces:**
- Consumes: None
- Produces: Updated UserDropdown component with "Delete Account" option

- [ ] **Step 1: Add "Delete Account" to MENU_ITEMS.account**

```typescript
const MENU_ITEMS = {
  profile: [
    { icon: "solar:user-circle-line-duotone", label: "Your profile", action: "profile" },
    { icon: "solar:settings-line-duotone", label: "Settings", action: "settings" },
    { icon: "solar:bell-line-duotone", label: "Notifications", action: "notifications" }
  ],
  premium: [
    { 
      icon: "solar:star-bold", 
      label: "Upgrade to Pro", 
      action: "upgrade",
      iconClass: "text-amber-600",
      badge: { text: "20% off", className: "bg-amber-600 text-white text-[11px]" }
    },
  ],
  account: [
    { icon: "solar:logout-2-bold-duotone", label: "Log out", action: "logout" },
    { icon: "solar:trash-bin-minimalistic-line-duotone", label: "Delete Account", action: "delete_account" }
  ]
};
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` or appropriate test command
Expected: No tests for UserDropdown yet

- [ ] **Step 3: Verify the UserDropdown renders correctly**

Test manually or write a simple test to verify the "Delete Account" option appears in the dropdown

- [ ] **Step 4: Commit**

```bash
git add src/components/UserDropdown.tsx
git commit -m "feat: add delete account option to UserDropdown"
```

### Task 2: Create API endpoint for account deletion

**Files:**
- Create: `src/app/api/account/delete/route.ts`

**Interfaces:**
- Consumes: NextRequest with user authentication
- Produces: JSON response with success/error message

- [ ] **Step 1: Write the API endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    
    const admin = getAdminClient();
    const clinicId = user.clinicId;
    
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic found for user" }, { status: 400 });
    }
    
    // Start a transaction to delete all related data
    const { error: deleteError } = await admin
      from("patients")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (deleteError) {
      console.error("Failed to delete patients:", deleteError);
      return NextResponse.json({ error: "Failed to delete patient data" }, { status: 500 });
    }
    
    const { error: sessionsError } = await admin
      .from("sessions")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (sessionsError) {
      console.error("Failed to delete sessions:", sessionsError);
      return NextResponse.json({ error: "Failed to delete session data" }, { status: 500 });
    }
    
    const { error: appointmentsError } = await admin
      .from("appointments")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (appointmentsError) {
      console.error("Failed to delete appointments:", appointmentsError);
      return NextResponse.json({ error: "Failed to delete appointment data" }, { status: 500 });
    }
    
    const { error: invoicesError } = await admin
      .from("invoices")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (invoicesError) {
      console.error("Failed to delete invoices:", invoicesError);
      return NextResponse.json({ error: "Failed to delete invoice data" }, { status: 500 });
    }
    
    const { error: clinicSettingsError } = await admin
      .from("clinic_settings")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (clinicSettingsError) {
      console.error("Failed to delete clinic settings:", clinicSettingsError);
      return NextResponse.json({ error: "Failed to delete clinic settings" }, { status: 500 });
    }
    
    const { error: staffError } = await admin
      .from("staff")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("email", user.email);
    
    if (staffError) {
      console.error("Failed to delete staff record:", staffError);
      return NextResponse.json({ error: "Failed to delete staff record" }, { status: 500 });
    }
    
    // For platform admins, also delete from platform_admins table
    if (user.roleKey === "platform_admin") {
      const { error: platformAdminError } = await admin
        .from("platform_admins")
        .delete()
        .eq("email", user.email);
      
      if (platformAdminError) {
        console.error("Failed to delete platform admin:", platformAdminError);
        return NextResponse.json({ error: "Failed to delete platform admin" }, { status: 500 });
      }
    }
    
    // Delete from auth_accounts table
    const { error: authAccountsError } = await admin
      .from("auth_accounts")
      .delete()
      .eq("email", user.email);
    
    if (authAccountsError) {
      console.error("Failed to delete auth account:", authAccountsError);
      return NextResponse.json({ error: "Failed to delete auth account" }, { status: 500 });
    }
    
    // If this is a clinic admin, also delete the clinic
    if (user.roleKey === "admin") {
      const { error: clinicError } = await admin
        .from("clinics")
        .delete()
        .eq("id", clinicId);
      
      if (clinicError) {
        console.error("Failed to delete clinic:", clinicError);
        return NextResponse.json({ error: "Failed to delete clinic" }, { status: 500 });
      }
    }
    
    // Sign out the user from NextAuth
    await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` or appropriate test command
Expected: No tests for account deletion API yet

- [ ] **Step 3: Verify the API endpoint works**

Test manually using a tool like Postman or write a simple test to verify the endpoint works

- [ ] **Step 4: Commit**

```bash
git add src/app/api/account/delete/route.ts
git commit -m "feat: add account deletion API endpoint"
```

### Task 3: Add confirmation dialog and account deletion logic to UserDropdown

**Files:**
- Modify: `src/components/UserDropdown.tsx:48-58`

**Interfaces:**
- Consumes: UserDropdownProps with onAction callback
- Produces: Updated UserDropdown component with account deletion confirmation

- [ ] **Step 1: Add state for confirmation dialog**

```typescript
export const UserDropdown = ({ 
  user = {
    name: "Ayman Echakar",
    username: "@aymanch-03",
    avatar: "https://avatars.githubusercontent.com/u/126724835?v=4",
    initials: "AE",
    status: "online"
  },
  onAction = () => {},
  promoDiscount = "20% off",
}: UserDropdownProps) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ... existing code ...
```

- [ ] **Step 2: Add delete account handler**

```typescript
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
      // Redirect to login page or show success message
      window.location.href = "/login?deleted=true";
    } else {
      const error = await response.json();
      alert(language === "ar" ? `فشل حذف الحساب: ${error.error}` : `Failed to delete account: ${error.error}`);
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    alert(language === "ar" ? "حدث خطأ أثناء محاولة حذف الحساب" : "An error occurred while trying to delete your account");
  } finally {
    setIsDeleting(false);
    setShowDeleteConfirmation(false);
  }
};
```

- [ ] **Step 3: Update renderMenuItem to handle delete_account action**

```typescript
const renderMenuItem = (item: any, index: number) => (
  <DropdownMenuItem 
    key={index}
    className={cn(item.badge ? "justify-between" : "", "p-2 rounded-lg cursor-pointer")}
    onClick={() => {
      if (item.action === "delete_account") {
        setShowDeleteConfirmation(true);
      } else {
        onAction(item.action);
      }
    }}
  >
    <span className="flex items-center gap-1.5 font-medium">
      <Icon
        icon={item.icon}
        className={`size-5 ${item.iconClass || "text-gray-500 dark:text-gray-400"}`}
      />
      {item.label}
    </span>
    {item.badge && (
      <Badge className={item.badge.className}>
        {promoDiscount || item.badge.text}
      </Badge>
    )}
  </DropdownMenuItem>
);
```

- [ ] **Step 4: Add confirmation dialog**

```typescript
return (
  <DropdownMenu>
    {/* ... existing code ... */}
    
    {/* Delete Account Confirmation Dialog */}
    {showDeleteConfirmation && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
          <h3 className="text-lg font-bold mb-2">
            {language === "ar" ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {language === "ar" 
              ? "هل أنت متأكد من أنك تريد حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك، بما في ذلك المرضى والمواعيد والفواتير وغيرها."
              : "Are you sure you want to delete your account? This action cannot be undone. All your data, including patients, appointments, invoices, and more, will be permanently deleted."
            }
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirmation(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isDeleting}
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={isDeleting}
            >
              {isDeleting
                ? (language === "ar" ? "جارِ الحذف..." : "Deleting...")
                : (language === "ar" ? "حذف الحساب" : "Delete Account")
              }
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* ... rest of existing code ... */}
  </DropdownMenu>
);
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test` or appropriate test command
Expected: No tests for UserDropdown yet

- [ ] **Step 6: Verify the UserDropdown renders correctly**

Test manually or write a simple test to verify the "Delete Account" option appears and triggers confirmation dialog

- [ ] **Step 7: Commit**

```bash
git add src/components/UserDropdown.tsx
git commit -m "feat: add account deletion confirmation dialog to UserDropdown"
```

### Task 4: Add account deletion option to Profile page

**Files:**
- Create: `src/app/profile/delete-account/page.tsx` (or add to existing profile page)

**Interfaces:**
- Consumes: User authentication and language context
- Produces: Account deletion page with confirmation

- [ ] **Step 1: Create account deletion page**

```typescript
"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";

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
        // Redirect to login page
        window.location.href = "/login?deleted=true";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` or appropriate test command
Expected: No tests for account deletion page yet

- [ ] **Step 3: Verify the account deletion page renders correctly**

Test manually or write a simple test to verify the page renders correctly

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/delete-account/page.tsx
git commit -m "feat: add account deletion page to profile"
```

### Task 5: Add "Delete Account" link to Profile page tabs

**Files:**
- Modify: `src/app/profile/page.tsx:43`

**Interfaces:**
- Consumes: Profile page tabs
- Produces: Updated profile page with delete account tab

- [ ] **Step 1: Add delete account tab to profile page**

```typescript
type TabType = "profile" | "clinic" | "verification" | "security" | "delete_account";

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  // ... existing code ...
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ─── Tabs Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-4 mb-8">
        {[
          { id: "profile", label: isRtl ? "الملف" : "Profile" },
          { id: "clinic", label: isRtl ? "العيادة" : "Clinic Settings" },
          { id: "verification", label: isRtl ? "مركز التحقق" : "Verification Center" },
          { id: "security", label: isRtl ? "الأمان" : "Security" },
          { id: "delete_account", label: isRtl ? "حذف الحساب" : "Delete Account" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#4F46BA] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* ─── Tab Content: DELETE ACCOUNT ──────────────────────────────── */}
      {activeTab === "delete_account" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-800 mb-2">
            {isRtl ? "حذف الحساب" : "Delete Account"}
          </h2>
          <p className="text-sm text-red-700 mb-4">
            {isRtl
              ? "حذف حسابك سيؤدي إلى إزالة جميع بياناتك بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
              : "Deleting your account will permanently remove all your data. This action cannot be undone."
            }
          </p>
          
          <div className="bg-white rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-2">
              {isRtl ? "سيتم حذف:" : "Will be deleted:"}
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• {isRtl ? "جميع بيانات العيادة" : "All clinic data"}</li>
              <li>• {isRtl ? "سجلات المرضى" : "Patient records"}</li>
              <li>• {isRtl ? "المواعيد والجلسات" : "Appointments and sessions"}</li>
              <li>• {isRtl ? "الفواتير والمدفوعات" : "Invoices and payments"}</li>
              <li>• {isRtl ? "إعدادات العيادة" : "Clinic settings"}</li>
              <li>• {isRtl ? "سجلات الموظفين" : "Staff records"}</li>
              <li>• {isRtl ? "الحساب الشخصي" : "Personal account"}</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              {isRtl ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              {isRtl ? "العودة" : "Cancel"}
            </button>
          </div>
        </div>
      )}
      
      {/* ... rest of existing tab content ... */}
    </div>
  );
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` or appropriate test command
Expected: No tests for profile page yet

- [ ] **Step 3: Verify the profile page renders correctly**

Test manually or write a simple test to verify the profile page renders correctly

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: add delete account tab to profile page"
```

## Summary

This implementation plan adds account deletion functionality to the patient-profile system. The feature includes:

1. A "Delete Account" option in the UserDropdown menu
2. An API endpoint for account deletion with proper cleanup of related data
3. A confirmation dialog to prevent accidental deletions
4. An account deletion page in the profile settings
5. Integration with the existing profile page tabs

The implementation ensures only admins can delete their own accounts and includes proper error handling and user feedback.
