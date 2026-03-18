<script lang="ts">
  import { onMount } from "svelte";

  type EnforcementAlert = {
    recall_number: string;
    recalling_firm: string;
    product_description: string;
    reason_for_recall: string;
    report_date: string;
    classification: string;
    status: string;
    distribution_pattern?: string;
  };

  type EnforcementResponse = {
    results: EnforcementAlert[];
  };

  const OPEN_FDA_BASE_URL = "https://api.fda.gov/food/enforcement.json";
  const MAX_ALERTS = 20;

  let alerts = $state<EnforcementAlert[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state("");

  function formatDate(rawDate: string): string {
    if (!rawDate || rawDate.length !== 8) return "Unknown date";

    const year = Number(rawDate.slice(0, 4));
    const month = Number(rawDate.slice(4, 6));
    const day = Number(rawDate.slice(6, 8));
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
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

<main class="screen">
  <header class="page-header">
    <p class="eyebrow">Official Data Feed</p>
    <h1>Food Safety Alerts</h1>
    <p class="subtitle">Latest FDA food enforcement reports from openFDA.</p>
  </header>

  <section class="alerts-panel" aria-label="Latest FDA enforcement alerts">
    {#if isLoading}
      <p class="status">Loading latest enforcement alerts...</p>
    {:else if errorMessage}
      <p class="status error">{errorMessage}</p>
      <button class="retry" onclick={loadLatestEnforcementAlerts}>Try Again</button>
    {:else if alerts.length === 0}
      <p class="status">No enforcement alerts found.</p>
    {:else}
      <ul class="alerts-list">
        {#each alerts as alert (alert.recall_number)}
          <li class="alert-item">
            <div class="alert-top-row">
              <span class="badge">{alert.classification || "Unclassified"}</span>
              <span class="date">{formatDate(alert.report_date)}</span>
            </div>
            <h2>{alert.product_description || "FDA Enforcement Alert"}</h2>
            <p class="firm">{alert.recalling_firm || "Unknown recalling firm"}</p>
            <p class="reason">{alert.reason_for_recall || "Reason not provided."}</p>
            <p class="meta">Recall #{alert.recall_number} · {alert.status || "Status unknown"}</p>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <footer class="page-footer">
    <button class="customize" type="button">Customize Alerts</button>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Avenir Next", "Avenir", "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #f6fbff 0%, #eef5f9 45%, #e5edf3 100%);
    color: #163248;
  }

  .screen {
    min-height: 100svh;
    max-width: 56rem;
    margin: 0 auto;
    padding: 1.25rem 1rem 1.5rem;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
  }

  .page-header {
    padding: 0.5rem 0.25rem;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
    color: #2a5f87;
    font-weight: 700;
  }

  h1 {
    margin: 0.25rem 0;
    font-size: clamp(1.6rem, 5vw, 2.25rem);
    line-height: 1.1;
  }

  .subtitle {
    margin: 0;
    color: #335f80;
    font-size: 0.95rem;
  }

  .alerts-panel {
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid #c7d9e6;
    border-radius: 16px;
    backdrop-filter: blur(6px);
    padding: 0.75rem;
    overflow: hidden;
  }

  .alerts-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 62svh;
    overflow-y: auto;
    display: grid;
    gap: 0.65rem;
  }

  .alert-item {
    background: #fff;
    border: 1px solid #d3e2ee;
    border-radius: 12px;
    padding: 0.8rem;
    box-shadow: 0 3px 12px rgba(13, 66, 107, 0.08);
  }

  .alert-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.35rem;
    gap: 0.5rem;
  }

  .badge {
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    background: #e8f3fb;
    color: #1f5f8d;
    border: 1px solid #c6dded;
  }

  .date {
    font-size: 0.8rem;
    color: #5c7488;
    white-space: nowrap;
  }

  h2 {
    margin: 0.1rem 0 0.35rem;
    font-size: 1rem;
    line-height: 1.3;
    color: #123956;
  }

  .firm,
  .reason,
  .meta {
    margin: 0.2rem 0;
    font-size: 0.88rem;
    line-height: 1.35;
  }

  .firm {
    font-weight: 600;
  }

  .meta {
    color: #4f6a7f;
    font-size: 0.8rem;
  }

  .status {
    margin: 0.5rem;
    text-align: center;
    color: #2b5778;
  }

  .status.error {
    color: #a42828;
  }

  .page-footer {
    display: flex;
    justify-content: center;
  }

  .customize,
  .retry {
    border: none;
    border-radius: 999px;
    background: linear-gradient(120deg, #0f6ba7, #2f8fcb);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 0.62rem 1rem;
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(22, 95, 146, 0.24);
  }

  .retry {
    display: block;
    margin: 0 auto 0.5rem;
  }

  .customize:active,
  .retry:active {
    transform: translateY(1px);
  }

  @media (min-width: 700px) {
    .screen {
      padding: 1.75rem 1.25rem;
      gap: 1.1rem;
    }

    .alerts-panel {
      padding: 1rem;
    }

    .alerts-list {
      max-height: 67svh;
    }
  }
</style>
