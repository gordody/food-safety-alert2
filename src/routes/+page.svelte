<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import AboutPane from "$lib/components/AboutPane.svelte";
  import BottomTabBar from "$lib/components/BottomTabBar.svelte";
  import CustomAlertsTab from "$lib/components/tabs/CustomAlertsTab.svelte";
  import LocalAlertsTab from "$lib/components/tabs/LocalAlertsTab.svelte";
  import MoreMenu from "$lib/components/MoreMenu.svelte";
  import NavBar from "$lib/components/NavBar.svelte";
  import { aboutContent } from "$lib/constants/aboutContent";
  import { helpContent } from "$lib/constants/helpContent";
  import { PREF_KEYS, getPreference, setPreference } from "$lib/preferences";
  import { recallState } from "$lib/stores/recallState.svelte";
  import type { EnforcementAlert } from "$lib/types";

  type Tab = "local" | "custom" | "more";
  type TabAlertSelection = {
    alert: EnforcementAlert;
    alerts: EnforcementAlert[];
    locationLabel?: string;
    sourceTab: "local" | "custom";
  };

  let activeTab = $state<Tab>("local");
  let aboutOpen = $state(false);
  let helpOpen = $state(false);
  let moreMenuOpen = $state(false);

  const tabItems = [
    { id: "local", label: "Local", icon: "local" },
    { id: "custom", label: "Custom", icon: "custom" },
    { id: "more", label: "More", icon: "more" }
  ] as const;

  function openAbout(): void {
    moreMenuOpen = false;
    helpOpen = false;
    aboutOpen = true;
  }

  function closeAbout(): void {
    aboutOpen = false;
  }

  function openHelp(): void {
    moreMenuOpen = false;
    aboutOpen = false;
    helpOpen = true;
  }

  function closeHelp(): void {
    helpOpen = false;
  }

  function toggleMoreMenu(): void {
    moreMenuOpen = !moreMenuOpen;
  }

  function closeMoreMenu(): void {
    moreMenuOpen = false;
  }

  async function onTabAlertSelect(payload: TabAlertSelection): Promise<void> {
    recallState.recallListContext = {
      alerts: payload.alerts,
      sourceRoute: "/",
      activeTab: payload.sourceTab,
      locationLabel: payload.locationLabel,
    };
    await goto(`/recalls/${encodeURIComponent(payload.alert.recall_number)}`);
  }

  function onTabSelect(tabId: string): void {
    moreMenuOpen = false;
    activeTab = tabId as Tab;
    void setPreference(PREF_KEYS.activeTab, activeTab);
  }

  async function restoreLastActiveTab(): Promise<void> {
    const persistedTab = await getPreference<Tab>(PREF_KEYS.activeTab);
    if (persistedTab) {
      activeTab = persistedTab === "local" || persistedTab === "custom" || persistedTab === "more"
        ? persistedTab
        : "local";
      return;
    }

    const navTab = recallState.recallListContext?.activeTab;
    if (navTab) {
      activeTab = navTab === "local" || navTab === "custom" || navTab === "more"
        ? navTab
        : "local";
    }
  }

  onMount(async () => {
    await restoreLastActiveTab();
  });
</script>

<div class="screen">
  <NavBar
    eyebrow="Official Data Feed"
    title="Food Safety Alerts"
    subtitle="Latest FDA food enforcement reports from openFDA."
  />

  <LocalAlertsTab isActive={activeTab !== "custom"} onSelectAlert={onTabAlertSelect} />
  <CustomAlertsTab isActive={activeTab === "custom"} onSelectAlert={onTabAlertSelect} />

  <MoreMenu
    open={moreMenuOpen}
    onClose={closeMoreMenu}
    onOpenAbout={openAbout}
    onOpenHelp={openHelp}
  />

  <BottomTabBar
    items={tabItems}
    activeItem={activeTab}
    moreMenuOpen={moreMenuOpen}
    onSelect={onTabSelect}
    onMoreMenuToggle={toggleMoreMenu}
  />

  <AboutPane open={aboutOpen} onClose={closeAbout} content={aboutContent} paneId="about-pane-home" />
  <AboutPane open={helpOpen} onClose={closeHelp} content={helpContent} paneId="help-pane-home" />
</div>

<style>
  /* ── Global reset & system font ──────────────────────── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    background-color: #f2f2f7;
    color: #000000;
  }

  :global(html),
  :global(body) {
    height: 100%;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #1c1c1e;
      color: #ffffff;
    }
  }

  /* ── Screen layout ───────────────────────────────────── */
  .screen {
    min-height: 100vh;
    min-height: 100dvh;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top, 0px);
    background-color: inherit;
  }

</style>
