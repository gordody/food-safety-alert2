<script lang="ts">
  import {
    buildLocationLabel,
    detectLocation,
    loadLocationPreference,
    saveLocationPreference,
    type LocationPreference,
  } from "$lib/location";
  import { US_STATES } from "$lib/constants";
  import { untrack } from "svelte";

  type Props = {
    onStateChange: (stateCode: string) => void;
    initialStateCode?: string;
  };

  const { onStateChange, initialStateCode = "" }: Props = $props();

  // ── State ──────────────────────────────────────────────────────────────────

  type AutoStatus = "idle" | "detecting" | "success" | "failed";

  let autoEnabled = $state(false);
  let autoStatus = $state<AutoStatus>("idle");
  // untrack: we only want the mount-time snapshot of initialStateCode; stateCode is
  // independently managed after that (user picks a state, auto-detect runs, etc.).
  let stateCode = $state(untrack(() => initialStateCode));
  let city = $state<string | undefined>(undefined);

  // ── Derived label ──────────────────────────────────────────────────────────

  const locationLabel = $derived.by(() => {
    if (autoEnabled) {
      if (autoStatus === "detecting") return "Detecting location…";
      if (autoStatus === "success" && stateCode)
        return buildLocationLabel(city, stateCode);
      if (autoStatus === "failed") return "Location unavailable";
    }
    if (stateCode) return buildLocationLabel(city, stateCode);
    return "Select a state";
  });

  // ── Init from persisted preference ────────────────────────────────────────

  $effect(() => {
    void initializeFromPreference();
  });

  async function initializeFromPreference(): Promise<void> {
    const saved = await loadLocationPreference();
    if (saved) {
      autoEnabled = saved.auto;
      city = saved.city;
      const savedCode = saved.stateCode ?? "";
      const codeChanged = savedCode !== stateCode;
      stateCode = savedCode;
      // Only fire onStateChange if the preference differs from what the parent already
      // provided via initialStateCode — avoids a redundant refetch on every mount.
      if (codeChanged && savedCode) onStateChange(savedCode);
      if (saved.auto) {
        void runAutoDetect({ keepAutoOnFailure: false });
      }
      return;
    }

    autoEnabled = true;
    void runAutoDetect({ keepAutoOnFailure: false });
  }

  // ── Auto-detect ────────────────────────────────────────────────────────────

  async function runAutoDetect(options: { keepAutoOnFailure: boolean }): Promise<void> {
    autoStatus = "detecting";
    const result = await detectLocation();
    if (result) {
      stateCode = result.stateCode;
      city = result.city;
      autoStatus = "success";
      void persist();
      onStateChange(stateCode);
    } else {
      autoStatus = "failed";
      if (!options.keepAutoOnFailure) {
        autoEnabled = false;
      }
      void persist();
    }
  }

  function toggleAuto(enabled: boolean): void {
    autoEnabled = enabled;
    if (enabled) {
      // When users manually turn Auto back on, keep it on even if permission is denied.
      // This allows future permission grants to be retried from the same control.
      void runAutoDetect({ keepAutoOnFailure: true });
    } else {
      autoStatus = "idle";
      void persist();
    }
  }

  function handleStateSelect(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    stateCode = select.value;
    city = undefined;
    void persist();
    if (stateCode) onStateChange(stateCode);
  }

  async function persist(): Promise<void> {
    const pref: LocationPreference = {
      auto: autoEnabled,
      stateCode,
      city,
      label: locationLabel,
    };
    await saveLocationPreference(pref);
  }
</script>

<div class="location-bar">
  <span class="location-icon" aria-hidden="true">📍</span>

  {#if autoEnabled && (autoStatus === "detecting" || autoStatus === "success")}
    <span class="location-label" class:detecting={autoStatus === "detecting"}>
      {locationLabel}
    </span>
  {:else if !autoEnabled || autoStatus === "failed"}
    {#if !autoEnabled}
      <select
        class="state-select"
        aria-label="Select state"
        value={stateCode}
        onchange={handleStateSelect}
      >
        <option value="" disabled>Select a state</option>
        {#each US_STATES as s (s.code)}
          <option value={s.code}>{s.name}</option>
        {/each}
      </select>
    {:else}
      <span class="location-label failed">{locationLabel}</span>
    {/if}
  {/if}

  <span class="auto-toggle">
    <label class="toggle-label" for="location-auto-toggle">Auto</label>
    <button
      id="location-auto-toggle"
      role="switch"
      aria-checked={autoEnabled}
      aria-label={autoEnabled ? "Disable auto location" : "Enable auto location"}
      class="toggle-switch"
      class:toggle-switch-on={autoEnabled}
      onclick={() => toggleAuto(!autoEnabled)}
      type="button"
    >
      <span class="toggle-thumb"></span>
    </button>
  </span>
</div>

<style>
  .location-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(242, 242, 247, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.2);
    min-height: 44px;
  }

  @media (prefers-color-scheme: dark) {
    .location-bar {
      background: rgba(28, 28, 30, 0.9);
      border-bottom-color: rgba(255, 255, 255, 0.12);
    }
  }

  .location-icon {
    font-size: 15px;
    flex-shrink: 0;
  }

  .location-label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #1c1c1e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .location-label.detecting {
    color: #8e8e93;
    font-style: italic;
  }

  .location-label.failed {
    color: #ff3b30;
  }

  @media (prefers-color-scheme: dark) {
    .location-label {
      color: #ffffff;
    }

    .location-label.detecting {
      color: #8e8e93;
    }
  }

  .state-select {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #1c1c1e;
    background: transparent;
    border: none;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    min-width: 0;
  }

  @media (prefers-color-scheme: dark) {
    .state-select {
      color: #ffffff;
    }

    .state-select option {
      background: #1c1c1e;
      color: #ffffff;
    }
  }

  /* ── Auto toggle ─────────────────────────────────────────────────────────── */

  .auto-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .toggle-label {
    font-size: 13px;
    color: #8e8e93;
    user-select: none;
  }

  .toggle-switch {
    position: relative;
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: #e5e5ea;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .toggle-switch-on {
    background: #34c759;
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
  }

  .toggle-switch-on .toggle-thumb {
    transform: translateX(18px);
  }

  @media (prefers-color-scheme: dark) {
    .toggle-switch {
      background: #3a3a3c;
    }

    .toggle-switch-on {
      background: #30d158;
    }
  }
</style>
