"use client";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">عذراً، حدث خطأ غير متوقع</h2>
        <p className="text-sm text-slate-500">يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، تواصل مع الدعم الفني.</p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">الرمز: {error.digest}</p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d8a8a] text-white rounded-lg hover:bg-[#0a6f6f] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
