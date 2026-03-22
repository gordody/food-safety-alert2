<script lang="ts">
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
</script>

<header class="nav-bar" aria-label={ariaLabel}>
  {#if eyebrow}
    <p class="nav-eyebrow">{eyebrow}</p>
  {/if}

  <h1 class="nav-large-title">{title}</h1>

  {#if subtitle}
    <p class="nav-subtitle">{subtitle}</p>
  {/if}
</header>

<style>
  .nav-bar {
    padding: 16px 20px 8px;
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
    .nav-subtitle {
      color: rgba(235, 235, 245, 0.6);
    }
  }
</style>
