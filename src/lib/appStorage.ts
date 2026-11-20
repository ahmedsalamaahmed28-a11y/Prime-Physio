const STORAGE_PREFIX = "prime-physio:tab:";

function storageKey(key: string) {
  if (typeof window === "undefined") return `${STORAGE_PREFIX}global:${key}`;
  const clinicId =
    window.sessionStorage.getItem("prime-physio:active-clinic-id") ||
    window.sessionStorage.getItem("preferred_clinic_id");
  const scope = clinicId ? `clinic:${clinicId}` : "global";
  return `${STORAGE_PREFIX}${scope}:${key}`;
}

function getTabStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  // sessionStorage survives refresh/navigation but is isolated between tabs.
  // This prevents one center's cached user or UI state from replacing another's.
  return window.sessionStorage;
}

export async function getAppValue<T>(key: string, fallback: T): Promise<T> {
  const storage = getTabStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load ${key} from tab storage`, error);
    return fallback;
  }
}

export async function setAppValue<T>(key: string, value: T): Promise<void> {
  const storage = getTabStorage();
  if (!storage) return;

  try {
    if (value === null || value === undefined) {
      storage.removeItem(storageKey(key));
      return;
    }
    storage.setItem(storageKey(key), JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to tab storage`, error);
    throw error;
  }
}
