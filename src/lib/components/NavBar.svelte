<script lang="ts">
  import { aboutContent } from "$lib/constants/aboutContent";
  import AboutPane from "$lib/components/AboutPane.svelte";

  type Props = {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    ariaLabel?: string;
  };

  let {
    eyebrow,
    title,
    subtitle,
    ariaLabel = title
  }: Props = $props();

  let aboutOpen = $state(false);

  function openAbout(): void {
    aboutOpen = true;
  }

  function closeAbout(): void {
    aboutOpen = false;
  }
</script>

<header class="nav-bar" aria-label={ariaLabel}>
  <div class="nav-top-row">
    <button
      type="button"
      class="logo-button"
      aria-label="Open about panel"
      aria-expanded={aboutOpen}
      aria-controls="about-pane"
      onclick={openAbout}
    >
      <img src="/images/app-icon.png" alt="App logo" class="app-logo" />
      <span class="logo-text">About</span>
    </button>
  </div>

  {#if eyebrow}
    <p class="nav-eyebrow">{eyebrow}</p>
  {/if}

  <h1 class="nav-large-title">{title}</h1>

  {#if subtitle}
    <p class="nav-subtitle">{subtitle}</p>
  {/if}
</header>

<AboutPane open={aboutOpen} onClose={closeAbout} content={aboutContent} />

<style>
  .nav-bar {
    padding: 16px 20px 8px;
  }

  .nav-top-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 8px;
  }

  .logo-button {
    min-height: 44px;
    border: none;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 6px;
    background: rgba(120, 120, 128, 0.12);
    color: inherit;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .logo-button:active {
    background: rgba(120, 120, 128, 0.2);
  }

  .app-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: block;
  }

  .logo-text {
    white-space: nowrap;
  }

  .nav-eyebrow {
    margin: 0 0 2px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8e8e93;
  }

  .nav-large-title {
    margin: 0 0 4px;
    font-size: 34px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.011em;
  }

  .nav-subtitle {
    margin: 0;
    font-size: 15px;
    color: rgba(60, 60, 67, 0.6);
  }

  @media (prefers-color-scheme: dark) {
    .logo-button {
      background: rgba(118, 118, 128, 0.24);
    }

    .logo-button:active {
      background: rgba(118, 118, 128, 0.32);
    }

    .nav-subtitle {
      color: rgba(235, 235, 245, 0.6);
    }
  }
</style>