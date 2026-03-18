<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { loadLatestEnforcementAlerts } from "$lib/api/enforcement";
  import AlertList from "$lib/components/AlertList.svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import { recallListContext } from "$lib/stores/recallNavigation";
  import type { EnforcementAlert } from "$lib/types";

  let alerts = $state<EnforcementAlert[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state("");

  type Tab = "all" | "local" | "custom" | "search";
  let activeTab = $state<Tab>("all");

  const tabItems = [
    { id: "all", label: "All", icon: "all" },
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "search", label: "Search", icon: "search" }
  ] as const;

  async function refreshAlerts(): Promise<void> {
    isLoading = true;
    errorMessage = "";

    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      alerts = await loadLatestEnforcementAlerts(apiKey);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load FDA enforcement alerts.";
    } finally {
      isLoading = false;
    }
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    recallListContext.set({ alerts, sourceRoute: "/" });
    await goto(`/recalls/${encodeURIComponent(alert.recall_number)}`);
  }

  onMount(() => {
    void refreshAlerts();
  });
</script>

<div class="screen">
  <NavBar
    eyebrow="Official Data Feed"
    title="Food Safety Alerts"
    subtitle="Latest FDA food enforcement reports from openFDA."
  />

  <main class="content">
    <AlertList {alerts} {isLoading} {errorMessage} onRetry={refreshAlerts} onSelect={openRecallDetails} />
  </main>

  <BottomTabBar items={tabItems} activeItem={activeTab} onSelect={(tabId) => activeTab = tabId as Tab} />
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
