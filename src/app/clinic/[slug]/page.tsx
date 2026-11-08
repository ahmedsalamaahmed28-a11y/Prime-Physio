import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export default async function ClinicLandingPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();

  const admin = getAdminClient();
  const { data: clinic, error } = await admin
    .from("clinics")
    .select("name, name_en, city, logo_url, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error || !clinic) notFound();

  return (
    <main dir="rtl" className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {clinic.logo_url ? <img src={clinic.logo_url} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-indigo-700">PP</span>}
        </div>
        <p className="mb-2 text-xs font-semibold tracking-widest text-indigo-600">PRIME PHYSIO</p>
        <h1 className="text-2xl font-bold text-slate-900">{clinic.name}</h1>
        {clinic.name_en && <p className="mt-1 text-sm text-slate-500">{clinic.name_en}</p>}
        {clinic.city && <p className="mt-2 text-sm text-slate-500">{clinic.city}</p>}
        <p className="mt-6 text-sm leading-7 text-slate-600">بوابة المركز لإدارة العيادة والسجلات الطبية والمواعيد.</p>
        <Link href={`/manage?clinic_slug=${encodeURIComponent(clinic.slug)}`} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46BA] px-6 text-sm font-semibold text-white transition hover:bg-indigo-700">
          تسجيل الدخول
        </Link>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-800">العودة إلى الصفحة الرئيسية</Link>
      </section>
    </main>
  );
}
