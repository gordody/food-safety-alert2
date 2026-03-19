import type { EnforcementAlert } from "$lib/types";

// ── US States ─────────────────────────────────────────────────────────────────

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

// ── Persistence (localStorage) ─────────────────────────────────────────────

export type LocationPreference = {
  auto: boolean;
  stateCode: string;
  city?: string;
  label: string;
};

const LOCATION_PREF_KEY = "fsa_location_preference";

export function loadLocationPreference(): LocationPreference | null {
  try {
    const raw = localStorage.getItem(LOCATION_PREF_KEY);
    return raw ? (JSON.parse(raw) as LocationPreference) : null;
  } catch {
    return null;
  }
}

export function saveLocationPreference(pref: LocationPreference): void {
  try {
    localStorage.setItem(LOCATION_PREF_KEY, JSON.stringify(pref));
  } catch {
    // Storage not available — silently ignore.
  }
}

// ── Geolocation ────────────────────────────────────────────────────────────

type Coords = { latitude: number; longitude: number };

async function getCoords(): Promise<Coords | null> {
  // Prefer the Tauri geolocation plugin when running inside Tauri.
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    try {
      const geo = await import("@tauri-apps/plugin-geolocation");
      const perm = await geo.requestPermissions(["location"]);
      if (
        perm.location !== "granted" &&
        perm.location !== "prompt-with-rationale"
      ) {
        return null;
      }
      const pos = await geo.getCurrentPosition();
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
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en",
      "User-Agent": "FoodSafetyAlertApp/1.0",
    },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    address?: Record<string, string>;
  };
  const addr = data.address ?? {};

  // ISO3166-2-lvl4 = "US-CA" for California.
  const iso = addr["ISO3166-2-lvl4"];
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
