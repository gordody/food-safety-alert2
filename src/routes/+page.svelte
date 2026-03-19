<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { loadLatestEnforcementAlerts } from "$lib/api/enforcement";
  import { prefetchProductImages } from "$lib/api/productImages";
  import AlertList from "$lib/components/AlertList.svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import LocationBar from "$lib/components/LocationBar.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import { filterAlertsByState } from "$lib/location";
  import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
  import { recallListContext } from "$lib/stores/recallNavigation";
  import type { EnforcementAlert } from "$lib/types";

  let alerts = $state<EnforcementAlert[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state("");

  type Tab = "all" | "local" | "custom" | "search";
  let activeTab = $state<Tab>("all");

  // State code selected/detected in the Local tab.
  let localStateCode = $state<string>("");

  const tabItems = [
    { id: "all", label: "All", icon: "all" },
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "search", label: "Search", icon: "search" }
  ] as const;

  // Alerts displayed in the list — filtered when Local tab is active.
  const displayedAlerts = $derived.by(() => {
    if (activeTab === "local" && localStateCode) {
      return filterAlertsByState(alerts, localStateCode);
    }
    return alerts;
  });

  async function refreshAlerts(): Promise<void> {
    isLoading = true;
    errorMessage = "";

    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      alerts = await loadLatestEnforcementAlerts(apiKey);

      // Warm the image cache in the background so detail cards can render images quickly.
      void prefetchProductImages(alerts);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load FDA enforcement alerts.";
    } finally {
      isLoading = false;
    }
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    recallListContext.set({ alerts: displayedAlerts, sourceRoute: "/", activeTab });
    await goto(`/recalls/${encodeURIComponent(alert.recall_number)}`);
  }

  function onTabSelect(tabId: string): void {
    activeTab = tabId as Tab;
    void setPreference(PREF_KEYS.activeTab, activeTab);
  }

  async function restoreLastActiveTab(): Promise<void> {
    const persistedTab = await getPreference<Tab>(PREF_KEYS.activeTab);
    if (persistedTab) {
      activeTab = persistedTab;
      return;
    }

    const navTab = get(recallListContext)?.activeTab;
    if (navTab) {
      activeTab = navTab as Tab;
    }
  }

  onMount(() => {
    void restoreLastActiveTab();
    void refreshAlerts();
  });
</script>

<div class="screen">
  <NavBar
    eyebrow="Official Data Feed"
    title="Food Safety Alerts"
    subtitle="Latest FDA food enforcement reports from openFDA."
  />

  {#if activeTab === "local"}
    <LocationBar onStateChange={(code) => { localStateCode = code; }} />
  {/if}

  <main class="content">
    <AlertList alerts={displayedAlerts} {isLoading} {errorMessage} onRetry={refreshAlerts} onSelect={openRecallDetails} />
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
