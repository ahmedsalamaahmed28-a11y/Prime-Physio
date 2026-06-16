import { supabase } from "@/lib/supabase";

export async function getAppValue<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from("app_key_values")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || data?.value === undefined || data?.value === null) {
    if (error) console.error(`Failed to load ${key} from Supabase`, error);
    return fallback;
  }

  return data.value as T;
}

export async function setAppValue<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase
    .from("app_key_values")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) throw error;
}
