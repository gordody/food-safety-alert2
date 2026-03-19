<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolveProductImage } from "$lib/api/productImages";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
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
  let activeRecallNumber = $state("");
  let resolvedImageUrls = $state<Record<string, string | null>>({});
  let resolvingImages = $state<Record<string, boolean>>({});

  $effect(() => {
    activeRecallNumber = data.recallNumber;
  });

  const activeAlert = $derived.by(() => {
    const inList = effectiveAlerts.find((a) => a.recall_number === activeRecallNumber);
    if (inList) return inList;
    if (data.alert?.recall_number === activeRecallNumber) return data.alert;
    return null;
  });

  const currentIndex = $derived.by(() => {
    if (!activeAlert) return -1;
    return effectiveAlerts.findIndex((a) => a.recall_number === activeAlert.recall_number);
  });

  const prevAlert = $derived.by(() => {
    if (currentIndex <= 0) return null;
    return effectiveAlerts[currentIndex - 1] ?? null;
  });

  const nextAlert = $derived.by(() => {
    if (currentIndex < 0) return null;
    return effectiveAlerts[currentIndex + 1] ?? null;
  });

  // ─── Drag-follow state ────────────────────────────────────────────────────
  let dragOffset = $state(0);
  let isDragging = $state(false);
  let isSnapping = $state(false);
  /** 1 = next alert is on the right; -1 = prev alert is on the left; 0 = none */
  let peekSide = $state<0 | 1 | -1>(0);
  let dragConfirmed = $state(false);
  let viewportWidth = $state(390);
  let touchStartX = 0;
  let touchStartY = 0;
  let activeCardLayerEl = $state<HTMLDivElement | null>(null);

  const SNAP_THRESHOLD = 72; // px — minimum travel to commit
  const SNAP_DURATION = 320; // ms — must match CSS transition below

  /** The adjacent alert currently peeking in from the edge. */
  const peekAlert = $derived.by(() => {
    if (peekSide === 1) return nextAlert;
    if (peekSide === -1) return prevAlert;
    return null;
  });

  function alertImageUrl(alert: EnforcementAlert): string {
    return resolvedImageUrls[alert.recall_number] ?? fallbackImage;
  }

  async function ensureImageResolved(alert: EnforcementAlert | null): Promise<void> {
    if (!alert) return;
    const key = alert.recall_number;

    if (key in resolvedImageUrls || resolvingImages[key]) return;

    resolvingImages = {
      ...resolvingImages,
      [key]: true,
    };

    try {
      const resolved = await resolveProductImage(alert);
      resolvedImageUrls = {
        ...resolvedImageUrls,
        [key]: resolved.url,
      };
    } catch {
      resolvedImageUrls = {
        ...resolvedImageUrls,
        [key]: null,
      };
    } finally {
      const { [key]: _ignored, ...remaining } = resolvingImages;
      resolvingImages = remaining;
    }
  }

  $effect(() => {
    void ensureImageResolved(activeAlert);
    void ensureImageResolved(peekAlert);
  });

  $effect(() => {
    // Each newly active recall card should start from the top.
    activeRecallNumber;
    activeCardLayerEl?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });

  /** translateX target for the peek card (offscreen at rest, slides in while dragging). */
  const peekOffset = $derived(peekSide * viewportWidth + dragOffset);

  const transitionStyle = $derived(
    isSnapping
      ? `transform ${SNAP_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      : "none",
  );

  // Non-passive touchmove handler registered via $effect so we can call preventDefault.
  let screenEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!screenEl) return;

    function handleTouchMove(event: TouchEvent): void {
      if (!isDragging) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (!dragConfirmed) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
          dragConfirmed = true;
        } else if (Math.abs(dy) > 14) {
          isDragging = false; // vertical scroll wins — cancel drag
          return;
        } else {
          return; // direction not yet determined
        }
      }

      event.preventDefault(); // block vertical scroll during confirmed horizontal drag

      dragOffset = dx;

      // Lock in which side the peek card lives once direction is confirmed.
      if (peekSide === 0) {
        if (dx < 0 && nextAlert) peekSide = 1;
        else if (dx > 0 && prevAlert) peekSide = -1;
      }
    }

    screenEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    const el = screenEl;
    return () => el.removeEventListener("touchmove", handleTouchMove);
  });

  function onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = true;
    isSnapping = false;
    dragOffset = 0;
    peekSide = 0;
    dragConfirmed = false;
  }

  function onTouchEnd(event: TouchEvent): void {
    if (!isDragging) return;
    isDragging = false;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const canGoNext = dx < -SNAP_THRESHOLD && nextAlert != null;
    const canGoPrev = dx > SNAP_THRESHOLD && prevAlert != null;

    if ((canGoNext || canGoPrev) && peekSide !== 0) {
      // Commit: active card flies offscreen, peek card animates to centre.
      isSnapping = true;
      dragOffset = peekSide * -viewportWidth;
      const target = peekSide === 1 ? nextAlert : prevAlert;

      setTimeout(() => {
        if (target) {
          activeRecallNumber = target.recall_number;
          window.history.replaceState(
            window.history.state,
            "",
            `/recalls/${encodeURIComponent(target.recall_number)}`,
          );
        }
        dragOffset = 0;
        peekSide = 0;
        isSnapping = false;
        dragConfirmed = false;
      }, SNAP_DURATION);
    } else if (dragConfirmed) {
      // Spring back.
      isSnapping = true;
      dragOffset = 0;
      setTimeout(() => {
        peekSide = 0;
        isSnapping = false;
        dragConfirmed = false;
      }, SNAP_DURATION);
    } else {
      dragOffset = 0;
      peekSide = 0;
      dragConfirmed = false;
    }
  }

  type Tab = "all" | "local" | "custom" | "search";
  let activeTab = $state<Tab>("all");

  const tabItems = [
    { id: "all", label: "All", icon: "all" },
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "search", label: "Search", icon: "search" },
  ] as const;

  async function goBack(): Promise<void> {
    if (history.length > 1) {
      history.back();
      return;
    }
    await goto(navContext?.sourceRoute ?? "/");
  }

  async function onBottomTabSelect(tabId: string): Promise<void> {
    activeTab = tabId as Tab;
    await goto(navContext?.sourceRoute ?? "/");
  }
</script>

{#snippet cardContent(alert: EnforcementAlert)}
  <section class="hero-card" aria-label="Recall overview">
    <img
      class="product-image"
      src={alertImageUrl(alert)}
      alt={`Product image placeholder for ${extractProductName(alert.product_description)}`}
      loading="lazy"
    />
    <div class="hero-copy">
      <p class="eyebrow">Recall #{alert.recall_number}</p>
      <h1 class="product-title">{extractProductName(alert.product_description)}</h1>
      <p class="status-pill">{alert.status || "Status unknown"}</p>
    </div>
  </section>

  <section class="inset-group" aria-label="Recall details">
    <article class="detail-row">
      <h2 class="detail-label">Recall reason</h2>
      <p class="detail-value">{alert.reason_for_recall || "Reason not provided."}</p>
    </article>

    <article class="detail-row">
      <h2 class="detail-label">Full product description</h2>
      <p class="detail-value">{alert.product_description || "Description not provided."}</p>
    </article>

    <article class="detail-row">
      <h2 class="detail-label">Recalling firm</h2>
      <p class="detail-value">{alert.recalling_firm || "Unknown recalling firm"}</p>
    </article>

    <article class="detail-row">
      <h2 class="detail-label">Location</h2>
      <p class="detail-value">
        {formatLocation(
          alert.city,
          alert.state,
          alert.country,
          alert.distribution_pattern,
        )}
      </p>
    </article>
  </section>
{/snippet}

<div
  class="detail-screen"
  bind:this={screenEl}
  role="region"
  aria-label="Recall detail page"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
>
  <header class="detail-nav">
    <button type="button" class="back-button" onclick={goBack} aria-label="Go back">
      <span class="back-chevron" aria-hidden="true">‹</span>
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
    <main class="detail-content" bind:clientWidth={viewportWidth}>
      <!-- Active card: follows the finger, snaps or springs back on release. -->
      <div
        class="card-layer"
        bind:this={activeCardLayerEl}
        style:transform="translateX({dragOffset}px)"
        style:transition={transitionStyle}
      >
        {@render cardContent(activeAlert)}
      </div>

      <!-- Peek card: the adjacent alert revealed as the user drags. -->
      {#if peekAlert}
        <div
          class="card-layer card-layer--peek"
          aria-hidden="true"
          style:transform="translateX({peekOffset}px)"
          style:transition={transitionStyle}
        >
          {@render cardContent(peekAlert)}
        </div>
      {/if}
    </main>

    <BottomTabBar items={tabItems} activeItem={activeTab} onSelect={onBottomTabSelect} />
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
    overflow: hidden; /* clips the peek card that extends beyond the screen edge */
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
    width: 34px;
    height: 34px;
    border: 1px solid rgba(60, 60, 67, 0.22);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #007aff;
    font-size: 32px;
    font-weight: 700;
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
    backdrop-filter: saturate(180%) blur(10px);
  }

  .back-chevron {
    line-height: 1;
    transform: translate(-1px, -2px);
  }

  .back-button:focus-visible {
    outline: 2px solid #007aff;
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .back-button {
      border-color: rgba(84, 84, 88, 0.65);
      background: rgba(44, 44, 46, 0.78);
    }
  }

  .nav-title {
    margin: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
  }

  .detail-content {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden; /* clips the off-screen peek card */
  }

  .card-layer {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 12px 16px 16px;
    will-change: transform;
    backface-visibility: hidden;
  }

  .card-layer--peek {
    z-index: 1;
  }

  .detail-content--empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 16px;
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
