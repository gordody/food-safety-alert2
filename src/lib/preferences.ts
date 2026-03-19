const STORE_FILE = "preferences.json";

export const PREF_KEYS = {
  location: "locationPreference",
  activeTab: "activeTab",
} as const;

type TauriStore = {
  get<T>(key: string): Promise<T | null | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let storePromise: Promise<TauriStore | null> | null = null;

async function getStore(): Promise<TauriStore | null> {
  if (typeof window === "undefined" || !("__TAURI__" in window)) {
    return null;
  }

  if (!storePromise) {
    storePromise = (async () => {
      try {
        const { load } = await import("@tauri-apps/plugin-store");
        return await load(STORE_FILE);
      } catch {
        return null;
      }
    })();
  }

  return storePromise;
}

export async function getPreference<T>(key: string): Promise<T | null> {
  const store = await getStore();
  if (!store) return null;

  try {
    return (await store.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  const store = await getStore();
  if (!store) return;

  try {
    await store.set(key, value);
    await store.save();
  } catch {
    // Best-effort persistence.
  }
}
