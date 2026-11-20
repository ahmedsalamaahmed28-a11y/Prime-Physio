const STORAGE_PREFIX = "prime-physio:tab:";

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
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
