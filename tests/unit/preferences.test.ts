import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStore, loadMock } = vi.hoisted(() => {
  const store = {
    get: vi.fn(),
    set: vi.fn(),
    save: vi.fn(),
  };

  return {
    mockStore: store,
    loadMock: vi.fn(async () => store),
  };
});

vi.mock("@tauri-apps/plugin-store", () => ({
  load: loadMock,
}));

import { getPreference, setPreference, PREF_KEYS } from "$lib/preferences";

describe("preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
    mockStore.set.mockResolvedValue(undefined);
    mockStore.save.mockResolvedValue(undefined);
  });

  it("exports expected preference keys", () => {
    expect(PREF_KEYS.location).toBe("locationPreference");
    expect(PREF_KEYS.activeTab).toBe("activeTab");
    expect(PREF_KEYS.localAlertsCache).toBe("localAlertsCache");
  });

  it("gets a stored value", async () => {
    mockStore.get.mockResolvedValueOnce("local");
    await expect(getPreference<string>(PREF_KEYS.activeTab)).resolves.toBe("local");
    expect(mockStore.get).toHaveBeenCalledWith(PREF_KEYS.activeTab);
  });

  it("returns null for undefined values", async () => {
    mockStore.get.mockResolvedValueOnce(undefined);
    await expect(getPreference(PREF_KEYS.activeTab)).resolves.toBeNull();
  });

  it("returns null and swallows get errors", async () => {
    mockStore.get.mockRejectedValueOnce(new Error("read error"));
    await expect(getPreference(PREF_KEYS.activeTab)).resolves.toBeNull();
  });

  it("sets value and saves", async () => {
    await setPreference(PREF_KEYS.activeTab, "local");
    expect(mockStore.set).toHaveBeenCalledWith(PREF_KEYS.activeTab, "local");
    expect(mockStore.save).toHaveBeenCalledTimes(1);
  });

  it("swallows set/save errors", async () => {
    mockStore.set.mockRejectedValueOnce(new Error("set error"));
    await expect(setPreference(PREF_KEYS.activeTab, "local")).resolves.toBeUndefined();

    mockStore.set.mockResolvedValueOnce(undefined);
    mockStore.save.mockRejectedValueOnce(new Error("save error"));
    await expect(setPreference(PREF_KEYS.activeTab, "local")).resolves.toBeUndefined();
  });

  it("initializes the store once and reuses it", async () => {
    mockStore.get.mockResolvedValue("x");
    await getPreference("k1");
    const callsAfterFirstLookup = loadMock.mock.calls.length;
    await getPreference("k2");
    await setPreference("k3", 123);
    expect(loadMock.mock.calls.length).toBe(callsAfterFirstLookup);
  });
});
