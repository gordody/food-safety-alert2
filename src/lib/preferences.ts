import { load } from '@tauri-apps/plugin-store';

const STORE_FILE = "preferences.json";

export const PREF_KEYS = {
  location: "locationPreference",
  activeTab: "activeTab",
  localAlertsCache: "localAlertsCache",
} as const;

// Import the actual Store type from Tauri for type safety
type Store = any; // We import this dynamically so use any to avoid build issues

const storeDefaults = {
  [PREF_KEYS.location]: null,
  [PREF_KEYS.activeTab]: null,
  [PREF_KEYS.localAlertsCache]: null,
};

let storePromise: Promise<Store | null> | null = null;

async function getStore(): Promise<Store | null> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        // Initialize with minimal defaults; the store file will be created automatically
        // in the app data directory if it doesn't exist
        const store = await load(STORE_FILE, { 
          defaults: storeDefaults,
          autoSave: 100 
        });
        console.info("Tauri Store loaded successfully from:", STORE_FILE);
        return store;
      } catch (error) {
        console.error("Failed to load Tauri Store:", error);
        // Log more details about what went wrong
        if (error instanceof Error) {
          console.error("Store error details:", error.message, error.stack);
        }
        return null;
      }
    })();
  }

  return storePromise;
}

export async function getPreference<T>(key: string): Promise<T | null> {
  const store = await getStore();
  if (!store) {
    console.warn("Store not available for getPreference");
    return null;
  }

  try {
    const value = (await store.get(key)) as T | null | undefined;
    return value ?? null;
  } catch (error) {
    console.error(`Failed to get preference "${key}":`, error);
    return null;
  }
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  const store = await getStore();
  if (!store) {
    console.warn("Store not available for setPreference");
    return;
  }

  try {
    await store.set(key, value);
    // Call save() to ensure persistence
    await store.save();
  } catch (error) {
    console.error(`Failed to set preference "${key}":`, error);
  }
}
