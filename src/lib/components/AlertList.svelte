<script lang="ts">
  import type { EnforcementAlert } from "$lib/types";
  import { extractProductName, formatDate, formatLocation } from "$lib/utils";

  interface Props {
    alerts: EnforcementAlert[];
    isLoading: boolean;
    errorMessage: string;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onRetry?: () => void;
    onSelect?: (alert: EnforcementAlert, index: number) => void;
    onLoadMore?: () => void;
  }

  const {
    alerts,
    isLoading,
    errorMessage,
    hasMore = false,
    isLoadingMore = false,
    onRetry,
    onSelect,
    onLoadMore,
  }: Props = $props();

  let loadMoreTrigger: HTMLDivElement | null = $state(null);
  const loadMoreTriggerIndex = $derived(Math.max(alerts.length - 5, 0));

  $effect(() => {
    if (!loadMoreTrigger || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            onLoadMore();
            break;
          }
        }
      },
      {
        rootMargin: "0px 0px 320px 0px",
        threshold: 0,
      },
    );

    observer.observe(loadMoreTrigger);

    return () => {
      observer.disconnect();
    };
  });

  function classificationVariant(classification: string): "critical" | "warning" | "safe" | "neutral" {
    const c = classification?.toLowerCase() ?? "";
    if (c.includes("class iii")) return "safe";
    if (c.includes("class ii")) return "warning";
    if (c.includes("class i")) return "critical";
    return "neutral";
  }
</script>

{#if isLoading}
  <div class="state-view">
    <div class="spinner" aria-label="Loading" role="status"></div>
    <p class="state-label">Loading alerts…</p>
  </div>
{:else if errorMessage}
  <div class="state-view">
    <p class="state-label state-label--error">{errorMessage}</p>
    {#if onRetry}
      <button class="btn-filled" onclick={onRetry}>Try Again</button>
    {/if}
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
          <button
            type="button"
            class="cell-button"
            onclick={() => onSelect?.(alert, i)}
            aria-label={`Open details for recall ${alert.recall_number}`}
          >
            <div class="cell-inner">
              <div class="cell-row-top">
                <span class="badge" data-variant={classificationVariant(alert.classification)}>
                  {alert.classification || "Unclassified"}
                </span>
                <time class="cell-date">{formatDate(alert.report_date)}</time>
              </div>
              <p class="cell-headline">{extractProductName(alert.product_description)}</p>
              <p class="cell-line">
                <span class="cell-label">Recall reason:</span>
                <span class="cell-value">{alert.reason_for_recall || "Reason not provided."}</span>
              </p>
              <p class="cell-line">
                <span class="cell-label">Recalling firm:</span>
                <span class="cell-value">{alert.recalling_firm || "Unknown recalling firm"}</span>
              </p>
              <p class="cell-line">
                <span class="cell-label">Location:</span>
                <span class="cell-value">
                  {formatLocation(alert.city, alert.state, alert.country, alert.distribution_pattern)}
                </span>
              </p>
              <p class="cell-footnote">Recall #{alert.recall_number} · {alert.status || "Status unknown"}</p>
            </div>
          </button>
          {#if hasMore && i === loadMoreTriggerIndex}
            <div bind:this={loadMoreTrigger} class="load-more-trigger" aria-hidden="true"></div>
          {/if}
          {#if i < alerts.length - 1}
            <div class="separator" aria-hidden="true"></div>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  {#if isLoadingMore}
    <div class="load-more-state" aria-live="polite">
      <div class="spinner" aria-label="Loading more alerts" role="status"></div>
      <p class="state-label">Loading more alerts…</p>
    </div>
  {/if}
{/if}

<style>
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

  .cell-button {
    display: block;
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .cell-button:focus-visible {
    outline: 2px solid #007aff;
    outline-offset: -2px;
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

  .cell-line {
    margin: 0 0 4px;
    font-size: 14px;
    line-height: 1.4;
    color: rgba(60, 60, 67, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    .cell-line {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .cell-label {
    font-weight: 600;
    color: rgba(60, 60, 67, 0.85);
  }

  @media (prefers-color-scheme: dark) {
    .cell-label {
      color: rgba(235, 235, 245, 0.85);
    }
  }

  .cell-value {
    margin-left: 4px;
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

  /* ── Filled button ──────────────────────────────────── */
  .btn-filled {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    border: none;
    background: #007aff;
    color: #ffffff;
    font-family: inherit;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
  }

  .load-more-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
  }

  .load-more-trigger {
    position: absolute;
    inset: auto 0 0;
    height: 1px;
    pointer-events: none;
  }
</style>
