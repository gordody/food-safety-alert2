<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    loadLatestEnforcementAlerts,
    loadLocalizedEnforcementAlerts,
    loadCustomEnforcementAlerts,
  } from "$lib/api/enforcement";
  import { prefetchProductImages } from "$lib/api/productImages";
  import AlertList from "$lib/components/AlertList.svelte";
  import AboutPane from "$lib/components/AboutPane.svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import MoreMenu from "$lib/components/MoreMenu.svelte";
  import LocationBar from "$lib/components/LocationBar.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import { aboutContent } from "$lib/constants/aboutContent";
  import { helpContent } from "$lib/constants/helpContent";
  import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
  import { recallState, type LocalAlertsCache } from "$lib/stores/recallState.svelte";
  import type { EnforcementAlert } from "$lib/types";
  import type { LocationPreference } from "$lib/location";

  type PersistedLocalAlertsCache = {
    stateCode?: string;
    alerts?: EnforcementAlert[];
    totalResults?: number;
  } | null;

  type RefreshOptions = {
    append?: boolean;
  };

  type CustomSearchForm = {
    location: string;
    keywords: string;
    reportDateFrom: string;
    reportDateTo: string;
  };

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

  let allAlerts = $state<EnforcementAlert[]>([]);
  let localAlerts = $state<EnforcementAlert[]>(initialLocalCache?.alerts ?? []);
  let customAlerts = $state<EnforcementAlert[]>([]);
  let localLoading = $state(false);
  let customLoading = $state(false);
  let localLoadingMore = $state(false);
  let customLoadingMore = $state(false);
  let localErrorMessage = $state("");
  let customErrorMessage = $state("");
  let localFetchNonce = 0;
  let customFetchNonce = 0;
  let localTotalResults = $state(initialLocalCache?.totalResults ?? initialLocalCache?.alerts.length ?? 0);
  let customTotalResults = $state(0);
  let localCacheNeedsMetadataRefresh = $state(false);

  let customLocation = $state("");
  let customKeywords = $state("");
  let customDateFrom = $state("");
  let customDateTo = $state("");
  let customSearchStarted = $state(false);

  type Tab = "local" | "custom" | "more";
  let activeTab = $state<Tab>("local");
  let aboutOpen = $state(false);
  let helpOpen = $state(false);
  let moreMenuOpen = $state(false);

  const displayedAlerts = $derived(activeTab === "custom" ? customAlerts : localAlerts);
  const isLoading = $derived(activeTab === "custom" ? customLoading : localLoading);
  const isLoadingMore = $derived(activeTab === "custom" ? customLoadingMore : localLoadingMore);
  const errorMessage = $derived(activeTab === "custom" ? customErrorMessage : localErrorMessage);

  let localStateCode = $state<string>(initialLocalCache?.stateCode ?? "ALL");

  const tabItems = [
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "more", label: "More", icon: "more" }
  ] as const;

  const hasMore = $derived(
    activeTab === "custom"
      ? customTotalResults > 0 && customAlerts.length < customTotalResults
      : localTotalResults > 0 && localAlerts.length < localTotalResults,
  );

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

  function buildCustomFilters(): CustomSearchForm {
    return {
      location: customLocation.trim(),
      keywords: customKeywords.trim(),
      reportDateFrom: customDateFrom,
      reportDateTo: customDateTo,
    };
  }

  function hasActiveCustomFilters(): boolean {
    const filters = buildCustomFilters();
    return Boolean(filters.location || filters.keywords || filters.reportDateFrom || filters.reportDateTo);
  }

  async function refreshCustomAlerts({ append = false }: RefreshOptions = {}): Promise<void> {
    if (!append && !hasActiveCustomFilters()) {
      customSearchStarted = true;
      customAlerts = [];
      customTotalResults = 0;
      customErrorMessage = "Choose at least one search option before searching.";
      return;
    }

    if (customDateFrom && customDateTo && customDateFrom > customDateTo) {
      customSearchStarted = true;
      customAlerts = [];
      customTotalResults = 0;
      customErrorMessage = "Start date must be earlier than end date.";
      return;
    }

    if (append) {
      if (customLoading || customLoadingMore) return;
      customLoadingMore = true;
    } else {
      customLoading = true;
      customSearchStarted = true;
    }

    customErrorMessage = "";
    const requestNonce = ++customFetchNonce;

    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      const { alerts, totalResults } = await loadCustomEnforcementAlerts(
        buildCustomFilters(),
        apiKey,
        append ? customAlerts.length : 0,
      );

      if (requestNonce !== customFetchNonce) return;

      customTotalResults = totalResults;
      customAlerts = append ? mergeUniqueAlerts(customAlerts, alerts) : alerts;

      if (alerts.length > 0) {
        void prefetchProductImages(alerts);
      }
    } catch (error) {
      if (requestNonce !== customFetchNonce) return;
      if (!append) {
        customErrorMessage = error instanceof Error ? error.message : "Failed to load custom FDA enforcement alerts.";
      }
    } finally {
      if (requestNonce === customFetchNonce) {
        if (append) {
          customLoadingMore = false;
        } else {
          customLoading = false;
        }
      }
    }
  }

  function submitCustomSearch(event: SubmitEvent): void {
    event.preventDefault();
    customAlerts = [];
    customTotalResults = 0;
    void refreshCustomAlerts();
  }

  function clearCustomSearch(): void {
    customLocation = "";
    customKeywords = "";
    customDateFrom = "";
    customDateTo = "";
    customSearchStarted = false;
    customAlerts = [];
    customTotalResults = 0;
    customErrorMessage = "";
  }

  function loadMoreDisplayedAlerts(): void {
    if (activeTab === "custom") {
      if (customAlerts.length >= customTotalResults) return;
      void refreshCustomAlerts({ append: true });
      return;
    }

    if (!localStateCode || localAlerts.length >= localTotalResults) return;
    void refreshLocalAlerts(localStateCode, { append: true });
  }

  function openAbout(): void {
    moreMenuOpen = false;
    helpOpen = false;
    aboutOpen = true;
  }

  function closeAbout(): void {
    aboutOpen = false;
  }

  function openHelp(): void {
    moreMenuOpen = false;
    aboutOpen = false;
    helpOpen = true;
  }

  function closeHelp(): void {
    helpOpen = false;
  }

  function toggleMoreMenu(): void {
    moreMenuOpen = !moreMenuOpen;
  }

  function closeMoreMenu(): void {
    moreMenuOpen = false;
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    let locationLabel: string | undefined;
    if (activeTab === "custom") {
      const filters = buildCustomFilters();
      const searchLabel = [filters.location, filters.keywords].filter(Boolean).join(" · ");
      locationLabel = searchLabel || "Custom Search";
    } else {
      const pref = await getPreference<LocationPreference>(PREF_KEYS.location);
      locationLabel =
        localStateCode === "ALL"
          ? "All States"
          : pref?.label || pref?.stateCode || recallState.localAlertsCache?.stateCode;
    }

    recallState.recallListContext = {
      alerts: displayedAlerts,
      sourceRoute: "/",
      activeTab,
      locationLabel,
    };
    await goto(`/recalls/${encodeURIComponent(alert.recall_number)}`);
  }

  function onTabSelect(tabId: string): void {
    moreMenuOpen = false;
    activeTab = tabId as Tab;
    void setPreference(PREF_KEYS.activeTab, activeTab);

    if (activeTab === "local") {
      const cached = normalizeLocalCache(recallState.localAlertsCache as PersistedLocalAlertsCache);
      const normalized = localStateCode.trim().toUpperCase();
      if (normalized && cached?.stateCode === normalized && cached.alerts.length > 0) {
        localAlerts = cached.alerts;
        localTotalResults = cached.totalResults;
        if (localCacheNeedsMetadataRefresh) {
          void refreshLocalAlerts(localStateCode);
        }
      } else if (localStateCode) {
        void refreshLocalAlerts(localStateCode);
      }
      return;
    }

    if (activeTab === "custom" && customSearchStarted && customAlerts.length === 0 && hasActiveCustomFilters()) {
      void refreshCustomAlerts();
    }
  }

  async function restoreLastActiveTab(): Promise<void> {
    const persistedTab = await getPreference<Tab>(PREF_KEYS.activeTab);
    if (persistedTab) {
      activeTab = persistedTab === "local" || persistedTab === "custom" || persistedTab === "more"
        ? persistedTab
        : "local";
      return;
    }

    const navTab = recallState.recallListContext?.activeTab;
    if (navTab) {
      activeTab = navTab === "local" || navTab === "custom" || navTab === "more"
        ? navTab
        : "local";
    }
  }

  onMount(async () => {
    await restoreLastActiveTab();

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

    if (activeTab === "local" && localStateCode) {
      const cached = normalizeLocalCache(recallState.localAlertsCache as PersistedLocalAlertsCache);
      const normalized = localStateCode.trim().toUpperCase();
      if (cached?.stateCode === normalized && cached.alerts.length > 0) {
        localAlerts = cached.alerts;
        localTotalResults = cached.totalResults;
        if (localCacheNeedsMetadataRefresh) {
          void refreshLocalAlerts(localStateCode);
        }
      } else {
        void refreshLocalAlerts(localStateCode);
      }
    }

    if (activeTab === "local" && localAlerts.length === 0) {
      void refreshLocalAlerts(localStateCode || "ALL");
    }
  });
</script>

<div class="screen">
  <NavBar
    eyebrow="Official Data Feed"
    title="Food Safety Alerts"
    subtitle="Latest FDA food enforcement reports from openFDA."
  />

  {#if activeTab === "local"}
    <LocationBar initialStateCode={localStateCode} onStateChange={onLocalStateChange} />
  {:else if activeTab === "custom"}
    <form class="custom-filters" onsubmit={submitCustomSearch}>
      <div class="custom-filters__grid">
        <label class="custom-filters__field">
          <span class="custom-filters__label">Location</span>
          <input
            type="text"
            placeholder="State, city, or distribution"
            value={customLocation}
            oninput={(event) => {
              customLocation = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </label>

        <label class="custom-filters__field">
          <span class="custom-filters__label">Keywords</span>
          <input
            type="text"
            placeholder="Product, reason, or firm"
            value={customKeywords}
            oninput={(event) => {
              customKeywords = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </label>

        <label class="custom-filters__field">
          <span class="custom-filters__label">From date</span>
          <input
            type="date"
            value={customDateFrom}
            oninput={(event) => {
              customDateFrom = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </label>

        <label class="custom-filters__field">
          <span class="custom-filters__label">To date</span>
          <input
            type="date"
            value={customDateTo}
            oninput={(event) => {
              customDateTo = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </label>
      </div>

      <div class="custom-filters__actions">
        <button class="btn-ghost" type="button" onclick={clearCustomSearch}>Clear</button>
        <button class="btn-filled" type="submit" disabled={customLoading}>Search</button>
      </div>
    </form>
  {/if}

  <main class="content">
    <AlertList
      alerts={displayedAlerts}
      {isLoading}
      {errorMessage}
      {hasMore}
      {isLoadingMore}
      onRetry={() => activeTab === "custom" ? refreshCustomAlerts() : refreshLocalAlerts(localStateCode || "ALL")}
      onSelect={openRecallDetails}
      onLoadMore={loadMoreDisplayedAlerts}
    />
  </main>

  <MoreMenu
    open={moreMenuOpen}
    onClose={closeMoreMenu}
    onOpenAbout={openAbout}
    onOpenHelp={openHelp}
  />

  <BottomTabBar
    items={tabItems}
    activeItem={activeTab}
    moreMenuOpen={moreMenuOpen}
    onSelect={onTabSelect}
    onMoreMenuToggle={toggleMoreMenu}
  />

  <AboutPane open={aboutOpen} onClose={closeAbout} content={aboutContent} paneId="about-pane-home" />
  <AboutPane open={helpOpen} onClose={closeHelp} content={helpContent} paneId="help-pane-home" />
</div>

<style>
  /* ── Global reset & system font ──────────────────────── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    background-color: #f2f2f7;
    color: #000000;
  }

  :global(html),
  :global(body) {
    height: 100%;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #1c1c1e;
      color: #ffffff;
    }
  }

  /* ── Screen layout ───────────────────────────────────── */
  .screen {
    min-height: 100vh;
    min-height: 100dvh;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top, 0px);
    background-color: inherit;
  }

  /* ── Content area ───────────────────────────────────── */
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .custom-filters {
    padding: 12px 16px;
    background: rgba(242, 242, 247, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.2);
    display: grid;
    gap: 10px;
  }

  .custom-filters__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .custom-filters__field {
    display: grid;
    gap: 4px;
  }

  .custom-filters__label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(60, 60, 67, 0.8);
  }

  .custom-filters__field input {
    border: 1px solid rgba(60, 60, 67, 0.22);
    border-radius: 8px;
    padding: 8px 10px;
    font: inherit;
    font-size: 14px;
    background: #fff;
    color: #000;
    min-height: 36px;
  }

  .custom-filters__field input:focus-visible {
    outline: 2px solid #007aff;
    outline-offset: 1px;
    border-color: transparent;
  }

  .custom-filters__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid rgba(60, 60, 67, 0.3);
    background: transparent;
    color: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-filled {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    background: #007aff;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-filled:disabled {
    opacity: 0.65;
    cursor: default;
  }

  @media (max-width: 520px) {
    .custom-filters__grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-color-scheme: dark) {
    .custom-filters {
      background: rgba(28, 28, 30, 0.9);
      border-bottom-color: rgba(255, 255, 255, 0.12);
    }

    .custom-filters__label {
      color: rgba(235, 235, 245, 0.8);
    }

    .custom-filters__field input {
      background: #2c2c2e;
      border-color: rgba(235, 235, 245, 0.22);
      color: #fff;
    }

    .btn-ghost {
      border-color: rgba(235, 235, 245, 0.26);
    }
  }

</style>
