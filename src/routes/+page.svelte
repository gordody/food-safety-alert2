<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { loadLatestEnforcementAlerts, loadLocalizedEnforcementAlerts } from "$lib/api/enforcement";
  import { prefetchProductImages } from "$lib/api/productImages";
  import AlertList from "$lib/components/AlertList.svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import LocationBar from "$lib/components/LocationBar.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
  import { recallState } from "$lib/stores/recallState.svelte";
  import type { EnforcementAlert } from "$lib/types";
  import type { LocationPreference } from "$lib/location";

  // Read the module-level cache once at instantiation so back-navigation restores state immediately.
  const initialLocalCache = recallState.localAlertsCache;

  let allAlerts = $state<EnforcementAlert[]>([]);
  let localAlerts = $state<EnforcementAlert[]>(initialLocalCache?.alerts ?? []);
  let allLoading = $state(true);
  let localLoading = $state(false);
  let errorMessage = $state("");
  let localFetchNonce = 0;

  type Tab = "all" | "local" | "custom" | "search";
  let activeTab = $state<Tab>("all");

  // isLoading reflects only the loading state of the currently active tab.
  const isLoading = $derived(activeTab === "local" ? localLoading : allLoading);

  // State code selected/detected in the Local tab.
  let localStateCode = $state<string>(initialLocalCache?.stateCode ?? "");

  const tabItems = [
    { id: "all", label: "All", icon: "all" },
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "search", label: "Search", icon: "search" }
  ] as const;

  // Alerts displayed in the list are sourced by the active tab.
  const displayedAlerts = $derived.by(() => {
    if (activeTab === "local") return localAlerts;
    return allAlerts;
  });

  async function refreshAllAlerts(): Promise<void> {
    allLoading = true;
    errorMessage = "";

    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      allAlerts = await loadLatestEnforcementAlerts(apiKey);

      // Warm the image cache in the background so detail cards can render images quickly.
      void prefetchProductImages(allAlerts);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load FDA enforcement alerts.";
    } finally {
      allLoading = false;
    }
  }

  async function refreshLocalAlerts(stateCode: string): Promise<void> {
    const normalizedStateCode = stateCode.trim().toUpperCase();
    if (!normalizedStateCode) {
      localAlerts = [];
      return;
    }

    localLoading = true;
    errorMessage = "";

    const requestNonce = ++localFetchNonce;
    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      const nextAlerts = await loadLocalizedEnforcementAlerts(normalizedStateCode, apiKey);
      if (requestNonce !== localFetchNonce) return;
      localAlerts = nextAlerts;
      recallState.localAlertsCache = { stateCode: normalizedStateCode, alerts: nextAlerts };
      void prefetchProductImages(localAlerts);
    } catch (error) {
      if (requestNonce !== localFetchNonce) return;
      errorMessage = error instanceof Error ? error.message : "Failed to load localized FDA enforcement alerts.";
    } finally {
      if (requestNonce === localFetchNonce) {
        localLoading = false;
      }
    }
  }

  function onLocalStateChange(code: string): void {
    const normalized = code.trim().toUpperCase();

    // LocationBar restored the same state the parent already has — use cache if available.
    if (normalized === localStateCode.trim().toUpperCase() && localAlerts.length > 0) {
      return;
    }

    localStateCode = code;
    void refreshLocalAlerts(code);
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    recallState.recallListContext = { alerts: displayedAlerts, sourceRoute: "/", activeTab };
    await goto(`/recalls/${encodeURIComponent(alert.recall_number)}`);
  }

  function onTabSelect(tabId: string): void {
    activeTab = tabId as Tab;
    void setPreference(PREF_KEYS.activeTab, activeTab);

    if (activeTab === "all") {
      if (allAlerts.length === 0) {
        void refreshAllAlerts();
      }
      return;
    }

    if (activeTab === "local") {
      const cached = recallState.localAlertsCache;
      const normalized = localStateCode.trim().toUpperCase();
      if (normalized && cached?.stateCode === normalized && cached.alerts.length > 0) {
        // Cache hit: restore results immediately without a network round-trip.
        localAlerts = cached.alerts;
      } else if (localStateCode) {
        void refreshLocalAlerts(localStateCode);
      }
      // If localStateCode is still empty, LocationBar will call onLocalStateChange when it mounts.
    }
  }

  async function restoreLastActiveTab(): Promise<void> {
    const persistedTab = await getPreference<Tab>(PREF_KEYS.activeTab);
    if (persistedTab) {
      activeTab = persistedTab;
      return;
    }

    const navTab = recallState.recallListContext?.activeTab;
    if (navTab) {
      activeTab = navTab as Tab;
    }
  }

  onMount(async () => {
    await restoreLastActiveTab();

    // If localStateCode was not in the in-memory cache, restore it from the persisted preference.
    if (!localStateCode) {
      const locPref = await getPreference<LocationPreference>(PREF_KEYS.location);
      if (locPref?.stateCode) {
        localStateCode = locPref.stateCode;
      }
    }

    // For the local tab: serve from cache when available, otherwise fetch.
    if (activeTab === "local" && localStateCode) {
      const cached = recallState.localAlertsCache;
      const normalized = localStateCode.trim().toUpperCase();
      if (cached?.stateCode === normalized && cached.alerts.length > 0) {
        localAlerts = cached.alerts;
      } else {
        void refreshLocalAlerts(localStateCode);
      }
    }

    // Always refresh the All-tab data in the background.
    void refreshAllAlerts();
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
  {/if}

  <main class="content">
    <AlertList
      alerts={displayedAlerts}
      {isLoading}
      {errorMessage}
      onRetry={activeTab === "local" ? () => refreshLocalAlerts(localStateCode) : refreshAllAlerts}
      onSelect={openRecallDetails}
    />
  </main>

  <BottomTabBar items={tabItems} activeItem={activeTab} onSelect={onTabSelect} />
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

</style>
