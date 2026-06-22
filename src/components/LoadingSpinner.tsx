"use client";

import { Loader } from "@/components/Loader"

export function LoadingSpinner({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${small ? "" : "min-h-screen bg-slate-50"}`}>
      <Loader size={small ? 32 : 48} color="#f08080" />
    </div>
  );
}

export default function FullPageLoader() {
  return <LoadingSpinner />;
}
