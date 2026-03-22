<script lang="ts">
  import type { AboutContent } from "$lib/constants/aboutContent";

  type Props = {
    open: boolean;
    onClose: () => void;
    content: AboutContent;
  };

  const { open, onClose, content }: Props = $props();

  $effect(() => {
    if (!open || typeof document === "undefined") return;

    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });
</script>

{#if open}
  <button
    type="button"
    class="about-scrim"
    aria-label="Close about panel"
    onclick={onClose}
  ></button>
{/if}

<div
  id="about-pane"
  class:about-pane-open={open}
  class="about-pane"
  aria-hidden={!open}
  role="dialog"
  aria-modal="true"
  aria-label={`About ${content.appName}`}
>
  <div class="about-header">
    <div>
      <p class="about-eyebrow">{content.panelLabel}</p>
      <h2 class="about-title">{content.appName}</h2>
    </div>
    <button type="button" class="about-close" aria-label="Close" onclick={onClose}>Done</button>
  </div>

  <div class="about-content">
    <section class="about-section">
      <h3>App</h3>
      <p>{content.description}</p>
    </section>

    {#each content.sections as section}
      <section class="about-section">
        <h3>{section.title}</h3>
        {#if section.description}
          <p>{section.description}</p>
        {/if}
        {#if section.items?.length}
          <ul>
            {#each section.items as item}
              <li>
                {item.name}
                {#each item.links as link}
                  <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                {/each}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}
  </div>

  <footer class="about-footer">{content.copyright}</footer>
</div>

<style>
  .about-scrim {
    position: fixed;
    inset: 0;
    border: none;
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(2px);
    z-index: 30;
  }

  .about-pane {
    position: fixed;
    top: 0;
    right: 0;
    width: min(92vw, 420px);
    height: 100dvh;
    transform: translateX(104%);
    transition: transform 220ms ease;
    background: #f2f2f7;
    color: #1c1c1e;
    z-index: 40;
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(60, 60, 67, 0.16);
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.18);
  }

  .about-pane-open {
    transform: translateX(0);
  }

  .about-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: max(14px, env(safe-area-inset-top, 0px)) 16px 12px;
    border-bottom: 1px solid rgba(60, 60, 67, 0.12);
    background: rgba(242, 242, 247, 0.84);
    backdrop-filter: blur(12px);
  }

  .about-eyebrow {
    margin: 0;
    font-size: 12px;
    color: #8e8e93;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }

  .about-title {
    margin: 2px 0 0;
    font-size: 24px;
    line-height: 1.1;
  }

  .about-close {
    min-height: 44px;
    border: none;
    border-radius: 10px;
    padding: 0 14px;
    background: rgba(0, 122, 255, 0.14);
    color: #007aff;
    font-weight: 600;
  }

  .about-content {
    overflow: auto;
    padding: 14px 16px 20px;
    -webkit-overflow-scrolling: touch;
    flex: 1;
  }

  .about-section {
    margin-bottom: 20px;
  }

  .about-section h3 {
    margin: 0 0 8px;
    font-size: 17px;
  }

  .about-section p {
    margin: 0;
    font-size: 15px;
    line-height: 1.45;
    color: rgba(28, 28, 30, 0.88);
  }

  .about-section ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .about-section li {
    display: grid;
    gap: 4px;
    font-size: 15px;
    line-height: 1.35;
  }

  .about-section a {
    color: #007aff;
    text-decoration: none;
  }

  .about-section a:hover,
  .about-section a:focus-visible {
    text-decoration: underline;
  }

  .about-footer {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    font-size: 13px;
    color: #8e8e93;
    border-top: 1px solid rgba(60, 60, 67, 0.12);
    background: rgba(242, 242, 247, 0.9);
  }

  @media (prefers-color-scheme: dark) {
    .about-pane {
      background: #1c1c1e;
      color: #f2f2f7;
      border-left-color: rgba(84, 84, 88, 0.48);
    }

    .about-header {
      background: rgba(28, 28, 30, 0.82);
      border-bottom-color: rgba(84, 84, 88, 0.36);
    }

    .about-section p {
      color: rgba(242, 242, 247, 0.84);
    }

    .about-footer {
      border-top-color: rgba(84, 84, 88, 0.36);
      background: rgba(28, 28, 30, 0.86);
    }
  }
</style>