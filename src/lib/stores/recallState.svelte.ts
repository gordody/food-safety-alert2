import type { EnforcementAlert } from "$lib/types";

export type RecallListContext = {
  alerts: EnforcementAlert[];
  sourceRoute: string;
  activeTab?: string;
  locationLabel?: string;
};

export type LocalAlertsCache = {
  stateCode: string;
  alerts: EnforcementAlert[];
  totalResults: number;
};

export type RecallState = {
  recallListContext: RecallListContext | null;
  localAlertsCache: LocalAlertsCache | null;
};

// Module-level rune state shared across routes and preserved through client-side navigation.
export const recallState = $state<RecallState>({
  recallListContext: null,
  localAlertsCache: null,
});
