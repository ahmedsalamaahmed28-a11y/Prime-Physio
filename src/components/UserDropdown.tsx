"use client"

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"
import { Icon } from "@iconify/react"
import { useLanguage } from "@/lib/LanguageContext";

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

interface UserDropdownProps {
  user?: {
    name: string;
    username: string;
    avatar?: string;
    initials: string;
    status: string;
  };
  onAction?: (action: string) => void;
  promoDiscount?: string;
}

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
  const { language } = useLanguage();
  
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer size-10 border border-white dark:border-gray-700">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="no-scrollbar w-[310px] rounded-2xl bg-gray-50 dark:bg-black/90 p-0" align="end">
        <section className="bg-white dark:bg-gray-100/10 backdrop-blur-lg rounded-2xl p-1 shadow border border-gray-200 dark:border-gray-700/20">
          <div className="flex items-center p-2">
            <div className="flex-1 flex items-center gap-2">
              <Avatar className="cursor-pointer size-10 border border-white dark:border-gray-700">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{user.name}</h3>
                <p className="text-muted-foreground text-xs">{user.username}</p>
              </div>
            </div>
            <Badge className="text-green-600 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-500/50 border-[0.5px] text-[11px] rounded-sm capitalize">
              {user.status}
            </Badge>
          </div>

          <DropdownMenuGroup>
            {MENU_ITEMS.profile.map(renderMenuItem)}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {MENU_ITEMS.premium.map(renderMenuItem)}
          </DropdownMenuGroup>
        </section>

        <section className="mt-1 p-1 rounded-2xl">
          <DropdownMenuGroup>
            {MENU_ITEMS.account.map(renderMenuItem)}
          </DropdownMenuGroup>
        </section>
      </DropdownMenuContent>
      
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
              onClick={async () => {
                if (isDeleting) return;
                
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
              }}
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
    </DropdownMenu>
  );
};

export default UserDropdown;
