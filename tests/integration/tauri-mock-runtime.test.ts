// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

beforeAll(() => {
  // Some mock helpers rely on WebCrypto APIs.
  if (!window.crypto?.getRandomValues) {
    throw new Error("WebCrypto getRandomValues is required for Tauri mock runtime tests");
  }
});

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
  delete (window as any).__TAURI__;
});

describe("Tauri mock runtime integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("persists and retrieves preferences via mockIPC-backed plugin store", async () => {
    const storeState = new Map<string, unknown>();
    const rid = 1;

    mockIPC((cmd, args) => {
      const payload = (args ?? {}) as Record<string, unknown>;

      if (cmd === "plugin:store|load") {
        expect(payload.path).toBe("preferences.json");
        return rid;
      }

      if (cmd === "plugin:store|set") {
        storeState.set(payload.key as string, payload.value);
        return null;
      }

      if (cmd === "plugin:store|get") {
        const key = payload.key as string;
        if (!storeState.has(key)) {
          return [null, false];
        }
        return [storeState.get(key), true];
      }

      if (cmd === "plugin:store|save") {
        return null;
      }

      return undefined;
    });

    const { getPreference, setPreference, PREF_KEYS } = await import("$lib/preferences");

    const locationPref = {
      auto: true,
      stateCode: "CA",
      city: "San Francisco",
      label: "San Francisco, CA",
    };

    await setPreference(PREF_KEYS.location, locationPref);
    const loaded = await getPreference<typeof locationPref>(PREF_KEYS.location);

    expect(loaded).toEqual(locationPref);
    expect(storeState.get(PREF_KEYS.location)).toEqual(locationPref);
  });

  it("detects location via tauri geolocation plugin and reverse geocoding", async () => {
    (window as any).__TAURI__ = {};

    mockIPC((cmd) => {
      if (cmd === "plugin:geolocation|check_permissions") {
        return { location: "granted" };
      }

      if (cmd === "plugin:geolocation|get_current_position") {
        return {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        };
      }

      return undefined;
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          address: {
            "ISO3166-2-lvl4": "US-CA",
            city: "San Francisco",
          },
        }),
        { status: 200 },
      ),
    );

    const { detectLocation } = await import("$lib/location");

    await expect(detectLocation()).resolves.toEqual({
      stateCode: "CA",
      city: "San Francisco",
    });
  });

  it("requests permissions when initial geolocation permission is not granted", async () => {
    (window as any).__TAURI__ = {};

    mockIPC((cmd) => {
      if (cmd === "plugin:geolocation|check_permissions") {
        return { location: "prompt" };
      }

      if (cmd === "plugin:geolocation|request_permissions") {
        return { location: "granted" };
      }

      if (cmd === "plugin:geolocation|get_current_position") {
        return {
          coords: {
            latitude: 47.6062,
            longitude: -122.3321,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        };
      }

      return undefined;
    });

    const invokeSpy = vi.spyOn((window as any).__TAURI_INTERNALS__, "invoke");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          address: {
            "ISO3166-2-lvl4": "US-WA",
            city: "Seattle",
          },
        }),
        { status: 200 },
      ),
    );

    const { detectLocation } = await import("$lib/location");

    await expect(detectLocation()).resolves.toEqual({
      stateCode: "WA",
      city: "Seattle",
    });

    expect(invokeSpy).toHaveBeenCalledWith("plugin:geolocation|check_permissions", {}, undefined);
    expect(invokeSpy).toHaveBeenCalledWith(
      "plugin:geolocation|request_permissions",
      { permissions: ["location"] },
      undefined,
    );
  });
});
