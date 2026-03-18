<script lang="ts">
  import { onMount } from "svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import type { EnforcementAlert, EnforcementResponse } from "$lib/types";
  import { OPEN_FDA_BASE_URL, MAX_ALERTS } from "$lib/constants";
  import { formatDate } from "$lib/utils";

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

  function classificationVariant(classification: string): "critical" | "warning" | "safe" | "neutral" {
    const c = classification?.toLowerCase() ?? "";
    if (c.includes("class iii")) return "safe";
    if (c.includes("class ii")) return "warning";
    if (c.includes("class i")) return "critical";
    return "neutral";
  }

  async function loadLatestEnforcementAlerts(): Promise<void> {
    isLoading = true;
    errorMessage = "";

    try {
      const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
      const params = new URLSearchParams({
        limit: String(MAX_ALERTS),
        sort: "report_date:desc"
      });

      if (apiKey) {
        params.set("api_key", apiKey);
      }

      const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`FDA API request failed (${response.status})`);
      }

      const data: EnforcementResponse = await response.json();
      alerts = data.results ?? [];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load FDA enforcement alerts.";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    void loadLatestEnforcementAlerts();
  });
</script>

<div class="screen">
  <NavBar
    eyebrow="Official Data Feed"
    title="Food Safety Alerts"
    subtitle="Latest FDA food enforcement reports from openFDA."
  />

  <main class="content">
    {#if isLoading}
      <div class="state-view">
        <div class="spinner" aria-label="Loading" role="status"></div>
        <p class="state-label">Loading alerts…</p>
      </div>
    {:else if errorMessage}
      <div class="state-view">
        <p class="state-label state-label--error">{errorMessage}</p>
        <button class="btn-filled" onclick={loadLatestEnforcementAlerts}>Try Again</button>
      </div>
    {:else if alerts.length === 0}
      <div class="state-view">
        <p class="state-label">No enforcement alerts found.</p>
      </div>
    {:else}
      <section class="inset-group" aria-label="Latest FDA enforcement alerts">
        <ul class="cell-list" role="list">
          {#each alerts as alert, i (alert.recall_number)}
            <li class="cell">
              <div class="cell-inner">
                <div class="cell-row-top">
                  <span class="badge" data-variant={classificationVariant(alert.classification)}>
                    {alert.classification || "Unclassified"}
                  </span>
                  <time class="cell-date">{formatDate(alert.report_date)}</time>
                </div>
                <p class="cell-headline">{alert.product_description || "FDA Enforcement Alert"}</p>
                <p class="cell-subhead">{alert.recalling_firm || "Unknown recalling firm"}</p>
                <p class="cell-body">{alert.reason_for_recall || "Reason not provided."}</p>
                <p class="cell-footnote">Recall #{alert.recall_number} · {alert.status || "Status unknown"}</p>
              </div>
              {#if i < alerts.length - 1}
                <div class="separator" aria-hidden="true"></div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
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

  /* ── State views (loading / error / empty) ──────────── */
  .state-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    gap: 12px;
  }

  .state-label {
    margin: 0;
    font-size: 17px;
    text-align: center;
    color: rgba(60, 60, 67, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    .state-label {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .state-label--error {
    color: #ff3b30;
  }

  @media (prefers-color-scheme: dark) {
    .state-label--error {
      color: #ff453a;
    }
  }

  /* iOS-style activity indicator */
  .spinner {
    width: 24px;
    height: 24px;
    border: 2.5px solid rgba(0, 122, 255, 0.2);
    border-top-color: #007aff;
    border-radius: 50%;
    animation: spin 0.72s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Inset grouped section ──────────────────────────── */
  .inset-group {
    margin: 8px 16px 16px;
    background: #ffffff;
    border-radius: 10px;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .inset-group {
      background: #2c2c2e;
    }
  }

  .cell-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* ── Cell ───────────────────────────────────────────── */
  .cell {
    position: relative;
  }

  .cell-inner {
    padding: 12px 16px;
    min-height: 44px;
  }

  /* Hairline inset separator */
  .separator {
    height: 0.5px;
    background: rgba(60, 60, 67, 0.29);
    margin-left: 16px;
  }

  @media (prefers-color-scheme: dark) {
    .separator {
      background: rgba(84, 84, 88, 0.65);
    }
  }

  /* ── Cell typography ────────────────────────────────── */
  .cell-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .cell-headline {
    margin: 0 0 3px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.3;
  }

  .cell-subhead {
    margin: 0 0 3px;
    font-size: 15px;
    line-height: 1.3;
    color: rgba(60, 60, 67, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    .cell-subhead {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .cell-body {
    margin: 0 0 5px;
    font-size: 15px;
    line-height: 1.4;
    color: rgba(60, 60, 67, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    .cell-body {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .cell-footnote {
    margin: 0;
    font-size: 13px;
    color: rgba(60, 60, 67, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    .cell-footnote {
      color: rgba(235, 235, 245, 0.3);
    }
  }

  .cell-date {
    font-size: 13px;
    color: rgba(60, 60, 67, 0.6);
    white-space: nowrap;
    flex-shrink: 0;
  }

  @media (prefers-color-scheme: dark) {
    .cell-date {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  /* ── Classification badge ───────────────────────────── */
  .badge {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    padding: 2px 6px;
    /* neutral fallback */
    background: rgba(142, 142, 147, 0.12);
    color: #8e8e93;
  }

  .badge[data-variant="critical"] {
    background: rgba(255, 59, 48, 0.12);
    color: #ff3b30;
  }

  .badge[data-variant="warning"] {
    background: rgba(255, 149, 0, 0.12);
    color: #ff9500;
  }

  .badge[data-variant="safe"] {
    background: rgba(52, 199, 89, 0.12);
    color: #34c759;
  }

  @media (prefers-color-scheme: dark) {
    .badge { color: #98989d; background: rgba(152, 152, 157, 0.2); }
    .badge[data-variant="critical"] { color: #ff453a; background: rgba(255, 69, 58, 0.2); }
    .badge[data-variant="warning"]  { color: #ff9f0a; background: rgba(255, 159, 10, 0.2); }
    .badge[data-variant="safe"]     { color: #32d74b; background: rgba(50, 215, 75, 0.2); }
  }

</style>
