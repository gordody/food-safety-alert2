import type { EnforcementAlert } from "$lib/types";
import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
import { 
  OPENSTREETMAP_API_BASE_URL, 
  OPENSTREETMAP_USER_AGENT, 
  OPENSTREETMAP_ACCEPT_LANGUAGE, 
  OPENSTREETMAP_ADDRESS_ISO_FIELD,
  US_STATES,
} from "$lib/constants";
import {
  checkPermissions,
  requestPermissions,
  getCurrentPosition,
} from '@tauri-apps/plugin-geolocation';


// ── Persistence ─────────────────────────────────────────────────────────────

export type LocationPreference = {
  auto: boolean;
  stateCode: string;
  city?: string;
  label: string;
};

export async function loadLocationPreference(): Promise<LocationPreference | null> {
  return getPreference<LocationPreference>(PREF_KEYS.location);
}

export async function saveLocationPreference(pref: LocationPreference): Promise<void> {
  await setPreference(PREF_KEYS.location, pref);
}

// ── Geolocation ────────────────────────────────────────────────────────────

type Coords = { latitude: number; longitude: number };

function isLocationPermissionGranted(permissionResult: unknown): boolean {
  const status = (permissionResult as { location?: string } | null)?.location;
  return status === "granted";
}

async function ensureTauriLocationPermission(): Promise<boolean> {
  try {
    const currentPermissions = await checkPermissions();
    if (isLocationPermissionGranted(currentPermissions)) {
      return true;
    }

    const requestedPermissions = await requestPermissions(['location']);
    return isLocationPermissionGranted(requestedPermissions);
  } catch {
    return false;
  }
}

async function getCoords(): Promise<Coords | null> {
  // Prefer the Tauri geolocation plugin when running inside Tauri.
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    try {
      const hasPermission = await ensureTauriLocationPermission();
      if (!hasPermission) {
        return null;
      }
      const pos = await getCurrentPosition();
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  // Browser fallback (used in `vite dev`).
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    return new Promise<Coords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { timeout: 10_000 },
      );
    });
  }

  return null;
}

// ── Reverse geocoding (OpenStreetMap Nominatim) ────────────────────────────

type GeoResult = { stateCode: string; city?: string };

async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  const url = `${OPENSTREETMAP_API_BASE_URL}?format=json&lat=${lat}&lon=${lon}&zoom=10`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": OPENSTREETMAP_ACCEPT_LANGUAGE,
      "User-Agent": OPENSTREETMAP_USER_AGENT,
    },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    address?: Record<string, string>;
  };
  const addr = data.address ?? {};

  // ISO3166-2-lvl4 = "US-CA" for California.
  const iso = addr[OPENSTREETMAP_ADDRESS_ISO_FIELD];
  let stateCode: string | null = null;
  if (iso?.startsWith("US-")) {
    stateCode = iso.slice(3);
  }

  // Fallback: match state name from our list.
  if (!stateCode && addr.state) {
    const match = US_STATES.find(
      (s) => s.name.toLowerCase() === addr.state!.toLowerCase(),
    );
    stateCode = match?.code ?? null;
  }

  if (!stateCode) return null;

  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.county ?? undefined;

  return { stateCode, city };
}

/** Full pipeline: get device location → reverse geocode → return state + city. */
export async function detectLocation(): Promise<GeoResult | null> {
  const coords = await getCoords();
  if (!coords) return null;
  return reverseGeocode(coords.latitude, coords.longitude);
}

// ── Alert filtering ────────────────────────────────────────────────────────

const NATIONWIDE_PATTERNS =
  /nationwide|all\s+50\s+states|all\s+states|united\s+states|u\.s\.|national/i;

export function filterAlertsByState(
  alerts: EnforcementAlert[],
  stateCode: string,
): EnforcementAlert[] {
  const stateObj = US_STATES.find((s) => s.code === stateCode);
  const stateName = stateObj?.name ?? "";

  return alerts.filter((alert) => {
    const dp = alert.distribution_pattern ?? "";
    const firmState = alert.state ?? "";

    // Nationwide distributions are visible everywhere.
    if (NATIONWIDE_PATTERNS.test(dp)) return true;

    // Recalling firm is in the selected state.
    if (firmState.toUpperCase() === stateCode) return true;

    // State abbreviation appears as a word in distribution_pattern.
    const abbrevRe = new RegExp(`\\b${stateCode}\\b`, "i");
    if (abbrevRe.test(dp)) return true;

    // Full state name appears in distribution_pattern.
    if (stateName && dp.toLowerCase().includes(stateName.toLowerCase()))
      return true;

    return false;
  });
}

/** Build the label shown in the location bar (e.g. "San Francisco, CA"). */
export function buildLocationLabel(city: string | undefined, stateCode: string): string {
  const stateObj = US_STATES.find((s) => s.code === stateCode);
  const statePart = stateObj?.name ?? stateCode;
  return city ? `${city}, ${stateCode}` : statePart;
}
