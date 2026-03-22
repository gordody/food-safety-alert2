<script lang="ts">
  export type BottomTabBarItem = {
    id: string;
    label: string;
    icon: "all" | "local" | "custom" | "search" | "more";
  };

  type Props = {
    items: readonly BottomTabBarItem[];
    activeItem: string;
    onSelect?: (id: string) => void;
    onOpenAbout?: () => void;
    ariaLabel?: string;
  };

  let {
    items,
    activeItem,
    onSelect,
    onOpenAbout,
    ariaLabel = "Main navigation"
  }: Props = $props();

  let moreMenuOpen = $state(false);

  function handleSelect(id: string): void {
    if (id === "more") {
      moreMenuOpen = !moreMenuOpen;
      return;
    }

    moreMenuOpen = false;
    onSelect?.(id);
  }

  function handleOpenAbout(): void {
    moreMenuOpen = false;
    onOpenAbout?.();
  }

  function closeMenu(): void {
    moreMenuOpen = false;
  }

  function iconUrl(icon: BottomTabBarItem["icon"]): string {
    return `/icons/${icon}.svg`;
  }
</script>

{#if moreMenuOpen}
  <button type="button" class="menu-scrim" aria-label="Close menu" onclick={closeMenu}></button>
{/if}

<nav class="tab-bar" aria-label={ariaLabel}>
  {#if moreMenuOpen}
    <div class="more-menu" role="menu" aria-label="More actions">
      <button type="button" class="more-menu-item" role="menuitem" onclick={handleOpenAbout}>About</button>
    </div>
  {/if}

  {#each items as item (item.id)}
    <button
      class="tab-item"
      class:tab-item--active={activeItem === item.id}
      aria-current={activeItem === item.id ? "page" : undefined}
      aria-expanded={item.id === "more" ? moreMenuOpen : undefined}
      onclick={() => handleSelect(item.id)}
    >
      {#if item.icon === "more"}
        <span class="tab-more-icon" aria-hidden="true">...</span>
      {:else}
        <span class="tab-icon" style={`--tab-icon: url('${iconUrl(item.icon)}')`} aria-hidden="true"></span>
      {/if}
      <span class="tab-label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  .menu-scrim {
    position: fixed;
    inset: 0;
    z-index: 9;
    border: 0;
    background: transparent;
    padding: 0;
  }

  .tab-bar {
    flex-shrink: 0;
    display: flex;
    position: sticky;
    bottom: 0;
    z-index: 10;
    background: rgba(249, 249, 249, 0.94);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-top: 0.5px solid rgba(60, 60, 67, 0.29);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  @media (prefers-color-scheme: dark) {
    .tab-bar {
      background: rgba(28, 28, 30, 0.94);
      border-top-color: rgba(84, 84, 88, 0.65);
    }
  }

  .more-menu {
    position: absolute;
    right: 10px;
    bottom: calc(100% + 8px + env(safe-area-inset-bottom, 0px));
    min-width: 152px;
    border-radius: 14px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.96);
    border: 0.5px solid rgba(60, 60, 67, 0.25);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    z-index: 11;
  }

  @media (prefers-color-scheme: dark) {
    .more-menu {
      background: rgba(44, 44, 46, 0.95);
      border-color: rgba(84, 84, 88, 0.6);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
    }
  }

  .more-menu-item {
    display: block;
    width: 100%;
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    padding: 0 12px;
    text-align: left;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }

  .more-menu-item:active {
    background: rgba(120, 120, 128, 0.16);
  }

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    padding: 8px 4px 6px;
    min-height: 49px;
    border: none;
    background: none;
    font-family: inherit;
    color: rgba(60, 60, 67, 0.5);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s;
  }

  .tab-item--active {
    color: #007aff;
  }

  @media (prefers-color-scheme: dark) {
    .tab-item {
      color: rgba(235, 235, 245, 0.45);
    }

    .tab-item--active {
      color: #0a84ff;
    }
  }

  .tab-icon {
    display: block;
    width: 25px;
    height: 25px;
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--tab-icon) center / contain no-repeat;
    -webkit-mask: var(--tab-icon) center / contain no-repeat;
  }

  .tab-more-icon {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    flex-shrink: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    line-height: 1;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1;
  }
</style>
