import { writable } from "svelte/store";
import type { EnforcementAlert } from "$lib/types";

export type LocalAlertsCache = {
  stateCode: string;
  alerts: EnforcementAlert[];
};

/** Module-level cache: survives SvelteKit client-side navigation (page unmount/remount). */
export const localAlertsCache = writable<LocalAlertsCache | null>(null);
