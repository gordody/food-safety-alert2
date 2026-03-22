<script lang="ts">
  import { loadCustomEnforcementAlerts } from "$lib/api/enforcement";
  import { prefetchProductImages } from "$lib/api/productImages";
  import AlertList from "$lib/components/AlertList.svelte";
  import type { EnforcementAlert } from "$lib/types";

  type RefreshOptions = {
    append?: boolean;
  };

  type CustomSearchForm = {
    location: string;
    keywords: string;
    reportDateFrom: string;
    reportDateTo: string;
  };

  type TabAlertSelection = {
    alert: EnforcementAlert;
    alerts: EnforcementAlert[];
    locationLabel?: string;
    sourceTab: "custom";
  };

  type Props = {
    isActive: boolean;
    onSelectAlert?: (payload: TabAlertSelection) => void | Promise<void>;
  };

  let { isActive, onSelectAlert }: Props = $props();

  let customAlerts = $state<EnforcementAlert[]>([]);
  let customLoading = $state(false);
  let customLoadingMore = $state(false);
  let customErrorMessage = $state("");
  let customFetchNonce = 0;
  let customTotalResults = $state(0);

  let customLocation = $state("");
  let customKeywords = $state("");
  let customDateFrom = $state("");
  let customDateTo = $state("");
  let customSearchStarted = $state(false);

  const hasMore = $derived(customTotalResults > 0 && customAlerts.length < customTotalResults);

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
    if (customAlerts.length >= customTotalResults) return;
    void refreshCustomAlerts({ append: true });
  }

  async function openRecallDetails(alert: EnforcementAlert): Promise<void> {
    const filters = buildCustomFilters();
    const searchLabel = [filters.location, filters.keywords].filter(Boolean).join(" · ");

    await onSelectAlert?.({
      alert,
      alerts: customAlerts,
      locationLabel: searchLabel || "Custom Search",
      sourceTab: "custom",
    });
  }

  $effect(() => {
    if (!isActive) return;
    if (customLoading || customLoadingMore) return;
    if (!customSearchStarted || customAlerts.length > 0) return;
    if (!hasActiveCustomFilters()) return;
    void refreshCustomAlerts();
  });
</script>

<div class="tab-panel" hidden={!isActive} aria-hidden={!isActive}>
  {#if isActive}
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
      alerts={customAlerts}
      isLoading={customLoading}
      errorMessage={customErrorMessage}
      {hasMore}
      isLoadingMore={customLoadingMore}
      onRetry={() => refreshCustomAlerts()}
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
