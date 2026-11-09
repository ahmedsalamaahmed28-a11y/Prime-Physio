"use client";

/**
 * Page-level skeleton shown while the application resolves the current session
 * or prepares a protected page. The layout is intentionally neutral so it
 * works across all dashboard routes without flashing a spinner.
 */
export function LoadingSpinner({ small }: { small?: boolean }) {
  if (small) {
    return (
      <span
        role="status"
        aria-label="Loading"
        className="shimmer-skeleton inline-block h-8 w-8 rounded-lg"
      />
    );
  }

  return (
    <main
      role="status"
      aria-label="جارٍ تحميل الصفحة"
      aria-busy="true"
      className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8"
    >
      <span className="sr-only">جارٍ تحميل الصفحة...</span>
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] rounded-2xl bg-white p-5 shadow-sm md:block">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="shimmer-skeleton h-14 w-14 rounded-xl" />
            <div className="shimmer-skeleton h-3 w-28 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div className="shimmer-skeleton h-8 w-8 rounded-lg" />
                <div className="shimmer-skeleton h-3 flex-1 rounded-full" />
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <header className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="shimmer-skeleton h-6 w-40 max-w-full rounded-lg" />
              <div className="shimmer-skeleton h-3 w-56 max-w-full rounded-full" />
            </div>
            <div className="shimmer-skeleton h-10 w-10 shrink-0 rounded-full" />
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="shimmer-skeleton h-3 w-24 rounded-full" />
                <div className="shimmer-skeleton h-8 w-28 rounded-lg" />
                <div className="shimmer-skeleton h-2 w-full rounded-full" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
            <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
              <div className="shimmer-skeleton h-5 w-36 rounded-lg" />
              <div className="shimmer-skeleton h-56 w-full rounded-xl" />
            </div>
            <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
              <div className="shimmer-skeleton h-5 w-32 rounded-lg" />
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="shimmer-skeleton h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="shimmer-skeleton h-3 w-3/4 rounded-full" />
                    <div className="shimmer-skeleton h-2 w-1/2 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="shimmer-skeleton h-5 w-40 rounded-lg" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-3">
                <div className="shimmer-skeleton h-4 rounded-md" />
                <div className="shimmer-skeleton h-4 rounded-md" />
                <div className="shimmer-skeleton h-4 rounded-md" />
                <div className="shimmer-skeleton h-4 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function FullPageLoader() {
  return <LoadingSpinner />;
}
