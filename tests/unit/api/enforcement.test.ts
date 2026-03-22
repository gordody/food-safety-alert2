import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadLatestEnforcementAlerts,
  loadLocalizedEnforcementAlerts,
  loadEnforcementAlertByRecallNumber,
  loadCustomEnforcementAlerts,
} from "$lib/api/enforcement";
import type { EnforcementResponse, EnforcementAlert } from "$lib/types";

globalThis.fetch = vi.fn();

const mockAlert: EnforcementAlert = {
  recall_number: "F-1234-2024",
  recalling_firm: "Example Corp",
  product_description: "Apple Juice",
  reason_for_recall: "Possible contamination",
  city: "San Francisco",
  state: "CA",
  country: "US",
  report_date: "20240315",
  classification: "Class II",
  status: "Ongoing",
  distribution_pattern: "CA",
};

const mockResponse: EnforcementResponse = {
  results: [mockAlert],
  meta: {
    last_page: 1,
    total_pages: 1,
    results: {
      skip: 0,
      limit: 20,
      total: 1,
    },
  },
};

describe("enforcement API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadLatestEnforcementAlerts", () => {
    it("fetches nationwide alerts with correct parameters", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await loadLatestEnforcementAlerts();

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].recall_number).toBe("F-1234-2024");
      expect(result.totalResults).toBe(1);
    });

    it("includes api_key in params when provided", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLatestEnforcementAlerts("test-api-key");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("api_key=test-api-key");
    });

    it("supports pagination with skip parameter", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLatestEnforcementAlerts(undefined, 20);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("skip=20");
    });

    it("throws error on failed API response", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

      await expect(loadLatestEnforcementAlerts()).rejects.toThrow(
        "FDA API request failed (404)"
      );
    });

    it("handles empty results", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ results: [], meta: { results: { total: 0 } } }),
          { status: 200 }
        )
      );

      const result = await loadLatestEnforcementAlerts();

      expect(result.alerts).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it("handles missing meta.results.total with default 0", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const result = await loadLatestEnforcementAlerts();

      expect(result.totalResults).toBe(0);
    });
  });

  describe("loadLocalizedEnforcementAlerts", () => {
    it("fetches alerts for a specific state", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await loadLocalizedEnforcementAlerts("CA");

      expect(result.alerts).toHaveLength(1);
      expect(result.totalResults).toBe(1);
    });

    it("builds location search query with state code and distribution clauses", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLocalizedEnforcementAlerts("CA");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("search=");
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";
      expect(search).toContain("state:CA");
      expect(search).toContain("distribution_pattern:*CA*");
      expect(search).toContain("distribution_pattern:*nationwide*");
    });

    it("includes state name in search query when available", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLocalizedEnforcementAlerts("CA");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";
      expect(search).toContain("California");
    });

    it("normalizes whitespace in state code", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLocalizedEnforcementAlerts("  ca  ");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";
      expect(search).toContain("state:CA");
    });

    it("returns empty results for empty state code", async () => {
      const result = await loadLocalizedEnforcementAlerts("");

      expect(result.alerts).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it("returns empty results for whitespace-only state code", async () => {
      const result = await loadLocalizedEnforcementAlerts("   ");

      expect(result.alerts).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it("supports pagination with skip parameter for localized alerts", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLocalizedEnforcementAlerts("CA", undefined, 40);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("skip=40");
    });

    it("includes api_key for localized alerts when provided", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadLocalizedEnforcementAlerts("CA", "my-key");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("api_key=my-key");
    });

    it("throws error on failed localized API response", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
      );

      await expect(loadLocalizedEnforcementAlerts("CA")).rejects.toThrow(
        "FDA API request failed (500)"
      );
    });
  });

  describe("loadEnforcementAlertByRecallNumber", () => {
    it("fetches a specific alert by recall number", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await loadEnforcementAlertByRecallNumber("F-1234-2024");

      expect(result).toEqual(mockAlert);
    });

    it("builds correct search query with quoted recall number", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadEnforcementAlertByRecallNumber("F-1234-2024");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";
      expect(search).toContain('recall_number:"F-1234-2024"');
    });

    it("limits results to 1 for single alert fetch", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadEnforcementAlertByRecallNumber("F-1234-2024");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("limit=1");
    });

    it("includes api_key when provided", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadEnforcementAlertByRecallNumber("F-1234-2024", "api-key-123");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("api_key=api-key-123");
    });

    it("returns null when no results found", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const result = await loadEnforcementAlertByRecallNumber("NONEXISTENT");

      expect(result).toBeNull();
    });

    it("returns null when results array is missing", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const result = await loadEnforcementAlertByRecallNumber("F-1234-2024");

      expect(result).toBeNull();
    });

    it("throws error on failed API response", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

      await expect(loadEnforcementAlertByRecallNumber("F-1234-2024")).rejects.toThrow(
        "FDA API request failed (404)"
      );
    });

    it("handles special characters in recall number", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadEnforcementAlertByRecallNumber("F-1234/2024");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("recall_number");
      expect(callUrl).toContain("F-1234");
    });
  });

  describe("loadCustomEnforcementAlerts", () => {
    it("builds location, keywords and date range query", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({
        location: "California",
        keywords: "salmonella lettuce",
        reportDateFrom: "2024-01-01",
        reportDateTo: "2024-12-31",
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";

      expect(search).toContain("city:*California*");
      expect(search).toContain("product_description:*salmonella*");
      expect(search).toContain("product_description:*lettuce*");
      expect(search).toContain("report_date:[20240101 TO 20241231]");
    });

    it("supports partial date range with only start date", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({
        keywords: "milk",
        reportDateFrom: "20240101",
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";

      expect(search).toContain("report_date:[20240101 TO 29991231]");
    });

    it("supports partial date range with only end date", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({
        location: "TX",
        reportDateTo: "20241231",
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";

      expect(search).toContain("report_date:[19000101 TO 20241231]");
    });

    it("swaps date range bounds when start is after end", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({
        reportDateFrom: "2024-12-31",
        reportDateTo: "2024-01-01",
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const params = new URLSearchParams(callUrl.split("?")[1]);
      const search = params.get("search") ?? "";

      expect(search).toContain("report_date:[20240101 TO 20241231]");
    });

    it("omits search param when no filters are provided", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({});

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).not.toContain("search=");
    });

    it("includes api_key and pagination for custom search", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await loadCustomEnforcementAlerts({ keywords: "eggs" }, "test-key", 40);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("api_key=test-key");
      expect(callUrl).toContain("skip=40");
    });

    it("throws when custom search API response is not ok", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "bad request" }), { status: 400 })
      );

      await expect(
        loadCustomEnforcementAlerts({ keywords: "eggs" })
      ).rejects.toThrow("FDA API request failed (400)");
    });
  });
});
