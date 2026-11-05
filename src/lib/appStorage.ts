const STORAGE_PREFIX = "prime-physio:";

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

export async function getAppValue<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load ${key} from local storage`, error);
    return fallback;
  }
}

export async function setAppValue<T>(key: string, value: T): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(storageKey(key));
      return;
    }
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to local storage`, error);
    throw error;
  }
}
