<script lang="ts">
  import { onMount } from "svelte";
  import { loadLatestEnforcementAlerts, loadLocalizedEnforcementAlerts } from "$lib/api/enforcement";
  import { prefetchProductImages } from "$lib/api/productImages";
  import AlertList from "$lib/components/AlertList.svelte";
  import LocationBar from "$lib/components/LocationBar.svelte";
  import type { LocationPreference } from "$lib/location";
  import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
  import { recallState, type LocalAlertsCache } from "$lib/stores/recallState.svelte";
  import type { EnforcementAlert } from "$lib/types";

  type PersistedLocalAlertsCache = {
    stateCode?: string;
    alerts?: EnforcementAlert[];
    totalResults?: number;
  } | null;

  type RefreshOptions = {
    append?: boolean;
  };

  type TabAlertSelection = {
    alert: EnforcementAlert;
    alerts: EnforcementAlert[];
    locationLabel?: string;
    sourceTab: "local";
  };

  type Props = {
    isActive: boolean;
    onSelectAlert?: (payload: TabAlertSelection) => void | Promise<void>;
  };

  let { isActive, onSelectAlert }: Props = $props();

  function normalizeLocalCache(cache: PersistedLocalAlertsCache): LocalAlertsCache | null {
    if (!cache?.stateCode) return null;

    const alerts = Array.isArray(cache.alerts) ? cache.alerts : [];

    return {
      stateCode: cache.stateCode,
      alerts,
      totalResults: typeof cache.totalResults === "number" ? cache.totalResults : alerts.length,
    };
  }

  function hasPagingMetadata(cache: PersistedLocalAlertsCache): boolean {
    return typeof cache?.totalResults === "number";
  }

  function mergeUniqueAlerts(
    existingAlerts: EnforcementAlert[],
    incomingAlerts: EnforcementAlert[],
  ): EnforcementAlert[] {
    if (incomingAlerts.length === 0) return existingAlerts;

    const seenRecallNumbers = new Set(existingAlerts.map((alert) => alert.recall_number));
    const nextAlerts = [...existingAlerts];

    for (const alert of incomingAlerts) {
      if (seenRecallNumbers.has(alert.recall_number)) continue;
      seenRecallNumbers.add(alert.recall_number);
      nextAlerts.push(alert);
    }

    return nextAlerts;
  }

  const initialLocalCache = normalizeLocalCache(recallState.localAlertsCache as PersistedLocalAlertsCache);

  let localAlerts = $state<EnforcementAlert[]>(initialLocalCache?.alerts ?? []);
  let localLoading = $state(false);
  let localLoadingMore = $state(false);
  let localErrorMessage = $state("");
  let localFetchNonce = 0;
  let localTotalResults = $state(initialLocalCache?.totalResults ?? initialLocalCache?.alerts.length ?? 0);
  let localCacheNeedsMetadataRefresh = $state(false);
  let hasMounted = $state(false);

  let localStateCode = $state<string>(initialLocalCache?.stateCode ?? "ALL");

  const hasMore = $derived(localTotalResults > 0 && localAlerts.length < localTotalResults);

  async function refreshLocalAlerts(
    stateCode: string,
    { append = false }: RefreshOptions = {},
  ): Promise<void> {
    const normalizedStateCode = stateCode.trim().toUpperCase();
    if (!normalizedStateCode) {
      localAlerts = [];
      localTotalResults = 0;
      localLoading = false;
      localLoadingMore = false;
      return;
    }

    if (append) {
      if (localLoading || localLoadingMore) return;
      localLoadingMore = true;
    } else {
      localLoading = true;
    }

    localErrorMessage = "";

    const requestNonce = ++localFetchNonce;
    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      const { alerts: nextAlerts, totalResults } =
        normalizedStateCode === "ALL"
          ? await loadLatestEnforcementAlerts(apiKey, append ? localAlerts.length : 0)
          : await loadLocalizedEnforcementAlerts(normalizedStateCode, apiKey, append ? localAlerts.length : 0);
      if (requestNonce !== localFetchNonce) return;

      localTotalResults = totalResults;
      localAlerts = append ? mergeUniqueAlerts(localAlerts, nextAlerts) : nextAlerts;

      const cacheData: LocalAlertsCache = {
        stateCode: normalizedStateCode,
        alerts: localAlerts,
        totalResults,
      };
      localCacheNeedsMetadataRefresh = false;
      recallState.localAlertsCache = cacheData;
      void setPreference(PREF_KEYS.localAlertsCache, cacheData);

      if (nextAlerts.length > 0) {
        void prefetchProductImages(nextAlerts);
      }
    } catch (error) {
      if (requestNonce !== localFetchNonce) return;
      if (!append) {
        localErrorMessage = error instanceof Error ? error.message : "Failed to load localized FDA enforcement alerts.";
      }
    } finally {
      if (requestNonce === localFetchNonce) {
        if (append) {
          localLoadingMore = false;
        } else {
          localLoading = false;
        }
      }
    }
  }

  function onLocalStateChange(code: string): void {
    const normalized = code.trim().toUpperCase();

    if (normalized === localStateCode.trim().toUpperCase() && localAlerts.length > 0) {
      return;
    }

    localStateCode = normalized;
    localAlerts = [];
    localTotalResults = 0;
    void refreshLocalAlerts(normalized);
  }

  function loadMoreDisplayedAlerts(): void {
    if (!localStateCode || localAlerts.length >= localTotalResults) return;
    void refreshLocalAlerts(localStateCode, { append: true });
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    const pref = await getPreference<LocationPreference>(PREF_KEYS.location);
    const locationLabel =
      localStateCode === "ALL"
        ? "All States"
        : pref?.label || pref?.stateCode || recallState.localAlertsCache?.stateCode;

    await onSelectAlert?.({
      alert,
      alerts: localAlerts,
      locationLabel,
      sourceTab: "local",
    });
  }

  onMount(async () => {
    const cachedPreference =
      (await getPreference<PersistedLocalAlertsCache>(PREF_KEYS.localAlertsCache)) ?? null;
    const cachedData = normalizeLocalCache(cachedPreference);
    localCacheNeedsMetadataRefresh = !!cachedData && !hasPagingMetadata(cachedPreference);
    if (cachedData) {
      recallState.localAlertsCache = cachedData;
      localAlerts = cachedData.alerts;
      localTotalResults = cachedData.totalResults;
      if (!localStateCode) {
        localStateCode = cachedData.stateCode || "ALL";
      }
    }

    if (!localStateCode) {
      const locPref = await getPreference<LocationPreference>(PREF_KEYS.location);
      if (locPref?.stateCode) {
        localStateCode = locPref.stateCode;
      } else {
        localStateCode = "ALL";
      }
    }

    hasMounted = true;

    if (!isActive) return;

    const cached = normalizeLocalCache(recallState.localAlertsCache as PersistedLocalAlertsCache);
    const normalized = localStateCode.trim().toUpperCase();
    if (cached?.stateCode === normalized && cached.alerts.length > 0) {
      localAlerts = cached.alerts;
      localTotalResults = cached.totalResults;
      if (localCacheNeedsMetadataRefresh) {
        void refreshLocalAlerts(localStateCode);
      }
      return;
    }

    if (localAlerts.length === 0) {
      void refreshLocalAlerts(localStateCode || "ALL");
    }
  });

  $effect(() => {
    if (!hasMounted || !isActive) return;
    if (localLoading || localLoadingMore) return;
    if (localAlerts.length > 0) return;
    void refreshLocalAlerts(localStateCode || "ALL");
  });
</script>

<div class="tab-panel" hidden={!isActive} aria-hidden={!isActive}>
  {#if isActive}
    <LocationBar initialStateCode={localStateCode} onStateChange={onLocalStateChange} />
  {/if}

  <main class="content">
    <AlertList
      alerts={localAlerts}
      isLoading={localLoading}
      errorMessage={localErrorMessage}
      {hasMore}
      isLoadingMore={localLoadingMore}
      onRetry={() => refreshLocalAlerts(localStateCode || "ALL")}
      onSelect={openRecallDetails}
      onLoadMore={loadMoreDisplayedAlerts}
    />
  </main>
</div>

<style>
  .tab-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
</style>
