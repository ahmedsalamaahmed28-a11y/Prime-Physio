"use client";

import { supabase } from "./supabase";

// Shortcut: creates a from() and immediately scopes it by clinic_id
 
export function fromTable(table: string, clinicId: string | null | undefined): any {
   
  let q: any = supabase.from(table);
  if (clinicId) q = q.eq("clinic_id", clinicId);
  return q;
}

// Bypass clinic scoping for super admin operations
 
export function allClinics(table: string): any {
  return supabase.from(table);
}

// Applies clinic_id .eq() to an existing query chain
 
export function withClinic(query: any, clinicId: string | null | undefined): any {
  if (!clinicId) return query;
  return query.eq("clinic_id", clinicId);
}
