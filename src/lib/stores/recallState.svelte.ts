import type { EnforcementAlert } from "$lib/types";

export type RecallListContext = {
  alerts: EnforcementAlert[];
  sourceRoute: string;
  activeTab?: string;
};

export type LocalAlertsCache = {
  stateCode: string;
  alerts: EnforcementAlert[];
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