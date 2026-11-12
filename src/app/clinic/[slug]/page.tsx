import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export default async function LegacyClinicLandingPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();
  redirect(`/${slug}`);
}
