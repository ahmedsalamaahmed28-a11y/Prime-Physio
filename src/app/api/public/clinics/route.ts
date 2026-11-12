import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, private" };

function safeHttpUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);

  if (slug && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80)) {
    return NextResponse.json({ error: "Invalid clinic slug" }, { status: 400, headers: noStore });
  }
  if (!slug && query.length < 2) {
    return NextResponse.json({ clinics: [] }, { headers: noStore });
  }

  try {
    const admin = getAdminClient();
    const baseQuery = admin
      .from("clinics")
      .select("id, name, name_en, slug, city, country, phone, address, logo_url, status, is_active")
      .eq("is_active", true)
      .eq("status", "active")
      .not("slug", "is", null);

    if (slug) {
      const { data: clinic, error } = await baseQuery.eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!clinic) {
        return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });
      }

      const [
        { data: settings, error: settingsError },
        { data: branch, error: branchError },
        { data: services, error: servicesError },
        { data: team, error: teamError },
      ] = await Promise.all([
        admin.from("clinic_settings")
          .select("clinic_name, phone, address, working_hours, city, country, logo_url, public_description, cover_url, whatsapp, website_url, instagram_url, facebook_url, maps_url, primary_color, cta_text")
          .eq("clinic_id", clinic.id).maybeSingle(),
        admin.from("branches")
          .select("id, short_name, full_name, slug, logo_url, specializations")
          .eq("clinic_id", clinic.id).eq("slug", slug).maybeSingle(),
        admin.from("clinic_services")
          .select("id, name, name_en, duration_minutes, price, is_package, package_sessions, discount_percent")
          .eq("clinic_id", clinic.id).eq("is_active", true).order("name", { ascending: true }).limit(30),
        admin.from("staff")
          .select("id, name, role, specialty")
          .eq("clinic_id", clinic.id).in("status", ["active", "نشط", "نشطة"]).order("name", { ascending: true }).limit(20),
      ]);

      if (settingsError || branchError || servicesError || teamError) {
        throw settingsError || branchError || servicesError || teamError;
      }

      const profile = {
        ...clinic,
        name: settings?.clinic_name || clinic.name,
        phone: settings?.phone || clinic.phone || "",
        address: settings?.address || clinic.address || "",
        city: settings?.city || clinic.city || "",
        country: settings?.country || clinic.country || "",
        logo_url: settings?.logo_url || branch?.logo_url || clinic.logo_url || "",
        public_description: settings?.public_description || "",
        cover_url: settings?.cover_url || "",
        whatsapp: settings?.whatsapp || "",
        working_hours: settings?.working_hours || "",
        website_url: safeHttpUrl(settings?.website_url),
        instagram_url: safeHttpUrl(settings?.instagram_url),
        facebook_url: safeHttpUrl(settings?.facebook_url),
        maps_url: safeHttpUrl(settings?.maps_url),
        primary_color: settings?.primary_color || "#4F46BA",
        cta_text: settings?.cta_text || "احجز موعدك",
      };

      return NextResponse.json({
        clinic: profile,
        branch: branch ? { id: branch.id, slug: branch.slug } : null,
        services: services || [],
        team: team || [],
      }, { headers: noStore });
    }

    const pattern = query.replace(/[,%()_]/g, " ").replace(/\s+/g, " ").trim();
    const { data, error } = await baseQuery
      .or(`name.ilike.%${pattern}%,name_en.ilike.%${pattern}%,city.ilike.%${pattern}%`)
      .order("name", { ascending: true })
      .limit(8);
    if (error) throw error;
    return NextResponse.json({ clinics: data || [] }, { headers: noStore });
  } catch (error) {
    console.error("Public clinic lookup failed:", error);
    return NextResponse.json({ error: "Clinic lookup is temporarily unavailable" }, { status: 503, headers: noStore });
  }
}
