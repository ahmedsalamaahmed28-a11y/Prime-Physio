const fs = require('fs');

let c = fs.readFileSync('src/app/manage/page.tsx', 'utf8');

c = c.replace('import PublicLayout from "@/components/PublicLayout";\r\n', '');
c = c.replace('import PublicLayout from "@/components/PublicLayout";\n', '');

c = c.replace(
  /export default function ManagePage\(\) {[\s\S]*?}\r?\n/,
  `export default function ManagePage() {
  return (
    <div className="min-h-screen bg-white flex w-full">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#4F46BA] border-t-transparent rounded-full animate-spin" /></div>}>
        <ManageContent />
      </Suspense>
    </div>
  )
}
`
);

const start = `  return (
    <>
        <div className="max-w-6xl mx-auto">`;
const end = `        {/* Forgot Password Modal */}`;

const sIdx = c.indexOf(start);
const eIdx = c.indexOf(end);

if (sIdx === -1 || eIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const replacement = `  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Brand Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-[#4F46BA] opacity-90" />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white w-full max-w-lg">
          <Link href="/" className="mb-10 transform hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Prime Physio" className="w-24 h-24 object-contain drop-shadow-2xl brightness-0 invert" />
          </Link>
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            {isRtl ? "مستقبل إدارة عيادات" : "The Future of Clinic"} <br /> 
            <span className="text-indigo-400">{isRtl ? "العلاج الطبيعي" : "Management"}</span>
          </h1>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed">
            {isRtl 
              ? "نظام متكامل يجمع بين السجلات الطبية، الإدارة المالية، وجدولة المواعيد في منصة واحدة سهلة الاستخدام."
              : "An integrated system combining EMR, billing, and scheduling in one easy-to-use platform."}
          </p>

          <div className="flex gap-4 justify-center">
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "سجلات طبية" : "EMR"}</div>
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "فواتير" : "Billing"}</div>
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "مواعيد" : "Calendar"}</div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white relative">
        <Link href="/" className={\`absolute top-6 \${isRtl ? "left-6" : "right-6"} text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors font-medium\`}>
          <ArrowRight className={\`w-4 h-4 \${isRtl ? "" : "rotate-180"}\`} />
          {isRtl ? "العودة للرئيسية" : "Back to Home"}
        </Link>
        
        <div className="w-full max-w-[400px]">
          {/* Logo for mobile only */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="Prime Physio" className="w-16 h-16 object-contain" />
          </div>

          <div className="mb-8 text-center lg:text-start">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {isRtl ? "مرحباً بعودتك" : "Welcome Back"}
            </h2>
            <p className="text-sm text-slate-500">
              {isRtl ? "سجل الدخول لإدارة عيادتك" : "Sign in to manage your clinic"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-4 mb-6 flex items-start gap-3">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isRtl ? "البريد الإلكتروني" : "Email"}
              </label>
              <div className="relative">
                <Mail className={\`absolute \${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400\`} />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={\`w-full h-11 bg-slate-50 border-slate-200 text-slate-800 rounded-xl focus:bg-white \${isRtl ? "pr-10" : "pl-10"}\`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isRtl ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Lock className={\`absolute \${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400\`} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={\`w-full h-11 bg-slate-50 border-slate-200 text-slate-800 rounded-xl focus:bg-white \${isRtl ? "pr-10 pl-10" : "pl-10 pr-10"}\`}
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className={\`absolute \${isRtl ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 cursor-pointer p-1\`}
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  ) : (
                    <EyeClosed className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <GradientCheckbox 
                  id="remember-me" 
                  checked={rememberMe} 
                  onChange={() => setRememberMe(!rememberMe)}
                  className="!h-[18px] !w-[18px]"
                />
                <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
                  {isRtl ? "تذكرني" : "Remember me"}
                </label>
              </div>
              <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","",""]); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotShowCode(""); setForgotError(""); }} className="text-sm font-semibold text-[#4F46BA] hover:text-[#3730a3] transition-colors">
                {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-semibold h-11 rounded-xl transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50 mt-4 shadow-md shadow-indigo-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                  <ArrowRight className={\`w-4 h-4 \${isRtl ? "rotate-180" : ""}\`} />
                </span>
              )}
            </button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-4 text-xs font-medium text-slate-400 bg-white px-2">{isRtl ? "أو" : "OR"}</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-11 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
              </svg>
              {isRtl ? "الدخول باستخدام Google" : "Continue with Google"}
            </button>

            <p className="text-center text-sm font-medium text-slate-500 mt-8">
              {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
              <Link href="/signup" className="text-[#4F46BA] hover:text-[#3730a3] transition-colors underline underline-offset-4 decoration-2 decoration-[#4F46BA]/30 hover:decoration-[#4F46BA]">
                {isRtl ? "إنشاء حساب جديد" : "Sign up"}
              </Link>
            </p>
          </form>
        </div>
      </div>

`;

c = c.substring(0, sIdx) + replacement + c.substring(eIdx);

// Also remove `</>` at the very end before the closing tag, which was part of the original return (<> ... </>)
// The original was:
//         )}
//     </>
//   );
// }
// We replaced the starting `<>` with our split screen structure, but we didn't remove the closing `</>`.
// So we need to remove `</>`
c = c.replace(/<\/>\r?\n\s*\);\r?\n}/, ');\n}');

fs.writeFileSync('src/app/manage/page.tsx', c, 'utf8');
console.log('Successfully updated manage/page.tsx');
