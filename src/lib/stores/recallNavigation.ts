import { writable } from "svelte/store";
import type { EnforcementAlert } from "$lib/types";

export type RecallListContext = {
  alerts: EnforcementAlert[];
  sourceRoute: string;
};

export const recallListContext = writable<RecallListContext | null>(null);
