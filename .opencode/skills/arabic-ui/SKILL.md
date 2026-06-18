---
name: arabic-ui
description: Use when building or modifying UI components, adding Arabic text, or working with RTL layout. Covers Arabic-first patterns, RTL styling, and i18n conventions in this project.
---

# Arabic-First UI Development

This project is Arabic-first with English as fallback.

## Core Pattern
```tsx
const { language } = useLanguage();
const isRtl = language === "ar";
```

All user-facing text uses:
```tsx
{isRtl ? "النص العربي" : "English text"}
```

## RTL Layout
- Use `dir={isRtl ? "rtl" : "ltr"}` on the root element of each page
- Arrow/chevron icons: flip with `className={isRtl ? "rotate-180" : ""}`
- Margin/padding: prefer logical properties or conditional classes
- Input padding: `left-3` stays left for LTR; RTL reverses. Test both directions.

## Component Checklist
- [ ] Text is wrapped in `isRtl ? "..." : "..."`
- [ ] `dir` attribute is set on the container
- [ ] Icons with directional meaning (arrows, chevrons) are flipped in RTL
- [ ] Form validation messages are in Arabic
- [ ] Date/time formatting uses Arabic numerals when appropriate
- [ ] Loading/success/error states have Arabic text

## Date & Numbers
- Use `Intl.DateTimeFormat` with `ar-EG` locale for Arabic dates
- Numbers should use Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) when in Arabic context

## Common Arabic Translations
- تسجيل الدخول = Sign In
- تسجيل الخروج = Sign Out
- برجاء الانتظار = Please wait
- تم بنجاح = Completed successfully
- حدث خطأ = An error occurred
- إلغاء = Cancel
- تأكيد = Confirm
- حفظ = Save
- تعديل = Edit
- حذف = Delete
