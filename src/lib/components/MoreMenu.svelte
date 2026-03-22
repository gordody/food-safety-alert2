<script lang="ts">
  type Props = {
    open: boolean;
    onClose?: () => void;
    onOpenAbout?: () => void;
    onOpenHelp?: () => void;
  };

  const { open, onClose, onOpenAbout, onOpenHelp }: Props = $props();

  function closeMenu(): void {
    onClose?.();
  }

  function handleOpenAbout(): void {
    onOpenAbout?.();
    onClose?.();
  }

  function handleOpenHelp(): void {
    onOpenHelp?.();
    onClose?.();
  }
</script>

{#if open}
  <button type="button" class="menu-scrim" aria-label="Close menu" onclick={closeMenu}></button>

  <div class="more-menu" role="menu" aria-label="More actions">
    <button type="button" class="more-menu-item" role="menuitem" onclick={handleOpenAbout}>About</button>
    <button type="button" class="more-menu-item" role="menuitem" onclick={handleOpenHelp}>Help</button>
  </div>
{/if}

<style>
  .menu-scrim {
    position: fixed;
    inset: 0;
    z-index: 9;
    border: 0;
    background: transparent;
    padding: 0;
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
</style>
