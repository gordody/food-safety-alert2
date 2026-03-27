import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCustomEnforcementAlerts } from "$lib/api/enforcement";

globalThis.fetch = vi.fn();

describe("Custom alerts filter integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockOkResponse(): void {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [],
          meta: {
            results: {
              total: 0,
            },
          },
        }),
        { status: 200 },
      ),
    );
  }

  function getSearchFromLastRequest(): string {
    const callUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    const params = new URLSearchParams(callUrl.split("?")[1]);
    return params.get("search") ?? "";
  }

  it("applies keywords, location, and date range together", async () => {
    mockOkResponse();

    await loadCustomEnforcementAlerts({
      keywords: "undeclared peanut",
      location: "california",
      reportDateFrom: "2024-01-01",
      reportDateTo: "2024-12-31",
    });

    const search = getSearchFromLastRequest();

    expect(search).toContain("city:*california*");
    expect(search).toContain("product_description:*undeclared*");
    expect(search).toContain("product_description:*peanut*");
    expect(search).toContain("report_date:[20240101 TO 20241231]");

    // Verify all filter groups are combined, not replaced.
    expect(search).toContain(" AND ");
  });

  it("applies various date ranges with location and keywords (from + to)", async () => {
    mockOkResponse();

    await loadCustomEnforcementAlerts({
      keywords: "undeclared peanut",
      location: "california",
      reportDateFrom: "20240115",
      reportDateTo: "20240331",
    });

    const search = getSearchFromLastRequest();

    expect(search).toContain("city:*california*");
    expect(search).toContain("product_description:*undeclared*");
    expect(search).toContain("product_description:*peanut*");
    expect(search).toContain("report_date:[20240115 TO 20240331]");
  });

  it("applies open-ended date range (from only) with other filters", async () => {
    mockOkResponse();

    await loadCustomEnforcementAlerts({
      keywords: "undeclared peanut",
      location: "california",
      reportDateFrom: "2024-05-01",
    });

    const search = getSearchFromLastRequest();

    expect(search).toContain("city:*california*");
    expect(search).toContain("product_description:*undeclared*");
    expect(search).toContain("product_description:*peanut*");
    expect(search).toContain("report_date:[20240501 TO 29991231]");
  });

  it("applies open-ended date range (to only) with other filters", async () => {
    mockOkResponse();

    await loadCustomEnforcementAlerts({
      keywords: "undeclared peanut",
      location: "california",
      reportDateTo: "2024-05-01",
    });

    const search = getSearchFromLastRequest();

    expect(search).toContain("city:*california*");
    expect(search).toContain("product_description:*undeclared*");
    expect(search).toContain("product_description:*peanut*");
    expect(search).toContain("report_date:[19000101 TO 20240501]");
  });

  it("normalizes reversed date range while still applying location and keywords", async () => {
    mockOkResponse();

    await loadCustomEnforcementAlerts({
      keywords: "undeclared peanut",
      location: "california",
      reportDateFrom: "2024-12-31",
      reportDateTo: "2024-01-01",
    });

    const search = getSearchFromLastRequest();

    expect(search).toContain("city:*california*");
    expect(search).toContain("product_description:*undeclared*");
    expect(search).toContain("product_description:*peanut*");
    expect(search).toContain("report_date:[20240101 TO 20241231]");
  });
});
