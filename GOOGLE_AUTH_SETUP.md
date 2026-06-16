# إعداد تسجيل الدخول بجوجل (Google Sign-In)

الآن قمنا بتثبيت مكتبة المصادقة المعتمدة **NextAuth.js** بداخل المشروع. 

لتشغيل تسجيل الدخول الفعلي بحساب Gmail الخاص بك على خوادم جوجل، ستحتاج فقط لإضافة البيانات التالية بداخل ملف الإعدادات البيئية المحلي `.env.local` في مجلد المشروع الرئيسي:

```env
# 1. إعدادات جوجل التي تحصل عليها من Google Cloud Console
GOOGLE_CLIENT_ID="أدخل_هنا_Client_ID_الخاص_بمشروعك.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="أدخل_هنا_Client_Secret_الخاص_بمشروعك"

# 2. إعدادات جلسة المصادقة والأمان للمشروع
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="أدخل_هنا_رمز_سري_عشوائي_لتشفير_البيانات"
```

---

### خطوات استخراج الـ Client ID و Client Secret من جوجل:
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً باسم عيادتك **Prime Physio**.
3. توجه إلى قسم **APIs & Services** ثم **Credentials**.
4. اضغط على **Create Credentials** واختبر **OAuth client ID**.
5. حدد نوع التطبيق **Web application**.
6. في خانة **Authorized JavaScript origins** ضع رابط التطبيق: `http://localhost:3000`.
7. في خانة **Authorized redirect URIs** ضع رابط إعادة التوجيه للمكتبة: `http://localhost:3000/api/auth/callback/google`.
8. انسخ الـ Client ID والـ Client Secret وضعهما بالملف المذكور أعلاه.
