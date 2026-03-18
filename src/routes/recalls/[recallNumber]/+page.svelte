<script lang="ts">
  import { goto } from "$app/navigation";
  import { recallListContext } from "$lib/stores/recallNavigation";
  import type { EnforcementAlert } from "$lib/types";
  import { extractProductName, formatLocation } from "$lib/utils";

  type PageData = {
    alert: EnforcementAlert | null;
    recallNumber: string;
    defaultAlerts: EnforcementAlert[];
  };

  const { data }: { data: PageData } = $props();

  const fallbackImage = "/images/product-placeholder.svg";
  const navContext = $derived($recallListContext);
  const effectiveAlerts = $derived(navContext?.alerts ?? data.defaultAlerts);

  const activeAlert = $derived.by(() => {
    if (data.alert) return data.alert;
    return navContext?.alerts.find((alert) => alert.recall_number === data.recallNumber) ?? null;
  });

  const currentIndex = $derived.by(() => {
    if (!activeAlert) return -1;
    return effectiveAlerts.findIndex((alert) => alert.recall_number === activeAlert.recall_number);
  });

  const prevAlert = $derived.by(() => {
    if (currentIndex <= 0) return null;
    return effectiveAlerts[currentIndex - 1] ?? null;
  });

  const nextAlert = $derived.by(() => {
    if (currentIndex < 0) return null;
    return effectiveAlerts[currentIndex + 1] ?? null;
  });

  let touchStartX = $state(0);
  let touchStartY = $state(0);

  async function goBack(): Promise<void> {
    if (history.length > 1) {
      history.back();
      return;
    }

    await goto(navContext?.sourceRoute ?? "/");
  }

  async function goToAlert(alert: EnforcementAlert | null): Promise<void> {
    if (!alert) return;
    await goto(`/recalls/${encodeURIComponent(alert.recall_number)}`);
  }

  function onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Horizontal swipe only when movement is clearly intentional.
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > 40) return;

    if (deltaX < 0) {
      void goToAlert(nextAlert);
    } else {
      void goToAlert(prevAlert);
    }
  }
</script>

<div
  class="detail-screen"
  role="region"
  aria-label="Recall detail page"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
>
  <header class="detail-nav">
    <button type="button" class="back-button" onclick={goBack} aria-label="Go back">
      <span class="back-chevron" aria-hidden="true">‹</span>
      Back
    </button>
    <p class="nav-title">Recall Details</p>
  </header>

  {#if !activeAlert}
    <main class="detail-content detail-content--empty">
      <h1 class="empty-title">Recall not found</h1>
      <p class="empty-copy">We could not find this recall item.</p>
      <button type="button" class="btn-filled" onclick={goBack}>Return</button>
    </main>
  {:else}
    <main class="detail-content">
      <section class="hero-card" aria-label="Recall overview">
        <img
          class="product-image"
          src={fallbackImage}
          alt={`Product image placeholder for ${extractProductName(activeAlert.product_description)}`}
          loading="lazy"
        />
        <div class="hero-copy">
          <p class="eyebrow">Recall #{activeAlert.recall_number}</p>
          <h1 class="product-title">{extractProductName(activeAlert.product_description)}</h1>
          <p class="status-pill">{activeAlert.status || "Status unknown"}</p>
        </div>
      </section>

      <section class="inset-group" aria-label="Recall details">
        <article class="detail-row">
          <h2 class="detail-label">Recall reason</h2>
          <p class="detail-value">{activeAlert.reason_for_recall || "Reason not provided."}</p>
        </article>

        <article class="detail-row">
          <h2 class="detail-label">Full product description</h2>
          <p class="detail-value">{activeAlert.product_description || "Description not provided."}</p>
        </article>

        <article class="detail-row">
          <h2 class="detail-label">Recalling firm</h2>
          <p class="detail-value">{activeAlert.recalling_firm || "Unknown recalling firm"}</p>
        </article>

        <article class="detail-row">
          <h2 class="detail-label">Location</h2>
          <p class="detail-value">
            {formatLocation(
              activeAlert.city,
              activeAlert.state,
              activeAlert.country,
              activeAlert.distribution_pattern,
            )}
          </p>
        </article>
      </section>
    </main>

    <nav class="swipe-nav" aria-label="Recall navigation">
      <button type="button" class="swipe-btn" onclick={() => goToAlert(prevAlert)} disabled={!prevAlert}>
        Previous
      </button>
      <p class="swipe-hint">Swipe left or right to move between recalls</p>
      <button type="button" class="swipe-btn" onclick={() => goToAlert(nextAlert)} disabled={!nextAlert}>
        Next
      </button>
    </nav>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    background-color: #f2f2f7;
    color: #000;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #1c1c1e;
      color: #fff;
    }
  }

  .detail-screen {
    min-height: 100vh;
    min-height: 100dvh;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top, 0px);
    background: inherit;
  }

  .detail-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    min-height: 52px;
    padding: 6px 12px;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.29);
    backdrop-filter: saturate(180%) blur(20px);
    background: rgba(249, 249, 249, 0.85);
  }

  @media (prefers-color-scheme: dark) {
    .detail-nav {
      border-bottom-color: rgba(84, 84, 88, 0.65);
      background: rgba(28, 28, 30, 0.75);
    }
  }

  .back-button {
    justify-self: start;
    border: none;
    background: transparent;
    color: #007aff;
    font-size: 17px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 8px 6px;
    cursor: pointer;
  }

  .back-chevron {
    font-size: 24px;
    line-height: 0.8;
  }

  .nav-title {
    margin: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px 16px;
    -webkit-overflow-scrolling: touch;
  }

  .detail-content--empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .empty-title {
    margin: 0;
    font-size: 24px;
  }

  .empty-copy {
    margin: 0;
    color: rgba(60, 60, 67, 0.6);
  }

  .hero-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .hero-card {
      background: #2c2c2e;
    }

    .empty-copy {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .product-image {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
  }

  .hero-copy {
    padding: 14px 14px 16px;
  }

  .eyebrow {
    margin: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
    font-weight: 600;
    color: rgba(60, 60, 67, 0.6);
  }

  .product-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 700;
  }

  .status-pill {
    display: inline-flex;
    margin-top: 10px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    background: rgba(0, 122, 255, 0.12);
    color: #007aff;
  }

  .inset-group {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .inset-group {
      background: #2c2c2e;
    }

    .eyebrow {
      color: rgba(235, 235, 245, 0.6);
    }
  }

  .detail-row {
    padding: 14px 14px 12px;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.29);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  @media (prefers-color-scheme: dark) {
    .detail-row {
      border-bottom-color: rgba(84, 84, 88, 0.65);
    }
  }

  .detail-label {
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(60, 60, 67, 0.85);
  }

  .detail-value {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: rgba(60, 60, 67, 0.9);
  }

  @media (prefers-color-scheme: dark) {
    .detail-label {
      color: rgba(235, 235, 245, 0.85);
    }

    .detail-value {
      color: rgba(235, 235, 245, 0.9);
    }
  }

  .swipe-nav {
    position: sticky;
    bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid rgba(60, 60, 67, 0.29);
    backdrop-filter: saturate(180%) blur(20px);
    background: rgba(249, 249, 249, 0.9);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
  }

  @media (prefers-color-scheme: dark) {
    .swipe-nav {
      border-top-color: rgba(84, 84, 88, 0.65);
      background: rgba(28, 28, 30, 0.85);
    }
  }

  .swipe-btn {
    min-height: 36px;
    border: none;
    background: transparent;
    color: #007aff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .swipe-btn:disabled {
    color: rgba(60, 60, 67, 0.3);
    cursor: default;
  }

  .swipe-hint {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: rgba(60, 60, 67, 0.55);
  }

  @media (prefers-color-scheme: dark) {
    .swipe-btn:disabled {
      color: rgba(235, 235, 245, 0.3);
    }

    .swipe-hint {
      color: rgba(235, 235, 245, 0.55);
    }
  }

  .btn-filled {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    border: none;
    background: #007aff;
    color: #fff;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
