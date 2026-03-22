import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProductImage } from "$lib/api/productImages";
import type { EnforcementAlert } from "$lib/types";

globalThis.fetch = vi.fn();

function makeAlert(recall: string, description: string): EnforcementAlert {
  return {
    recall_number: recall,
    recalling_firm: "Example Corp",
    product_description: description,
    reason_for_recall: "Possible contamination",
    report_date: "20240315",
    classification: "Class II",
    status: "Ongoing",
  };
}

describe("productImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns none when there are no GTIN candidates", async () => {
    const result = await resolveProductImage(makeAlert("R-1", "No barcode present"));
    expect(result).toEqual({ url: null, source: "none", confidence: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves from OpenFoodFacts when a GTIN is present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 1, product: { image_front_url: "https://img/front.jpg" } }), {
        status: 200,
      }),
    );

    const result = await resolveProductImage(makeAlert("R-2", "UPC 123456789012"));
    expect(result.url).toBe("https://img/front.jpg");
    expect(result.source).toBe("openfoodfacts");
    expect(result.gtin).toBe("123456789012");
  });

  it("falls back image fields in priority order", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 1, product: { image_url: "https://img/main.jpg" } }), {
        status: 200,
      }),
    );
    const result1 = await resolveProductImage(makeAlert("R-3", "EAN 1234567890123"));
    expect(result1.url).toBe("https://img/main.jpg");

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 1, product: { image_small_url: "https://img/small.jpg" } }), {
        status: 200,
      }),
    );
    const result2 = await resolveProductImage(makeAlert("R-4", "GTIN 12345678"));
    expect(result2.url).toBe("https://img/small.jpg");
  });

  it("returns none for non-ok responses or status != 1", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 500 }));
    const result1 = await resolveProductImage(makeAlert("R-5", "UPC 123456789012"));
    expect(result1.source).toBe("none");

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
    const result2 = await resolveProductImage(makeAlert("R-6", "UPC 123456789012"));
    expect(result2.source).toBe("none");
  });

  it("tries next candidate when one candidate fetch throws", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 1, product: { image_front_url: "https://img/found.jpg" } }), {
          status: 200,
        }),
      );

    const result = await resolveProductImage(makeAlert("R-7", "Codes 12345678 1234567890123"));
    expect(result.url).toBe("https://img/found.jpg");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("uses cache for repeated recall numbers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 1, product: { image_front_url: "https://img/cache.jpg" } }), {
        status: 200,
      }),
    );

    const alert = makeAlert("R-8", "UPC 123456789012");
    const a = await resolveProductImage(alert);
    const b = await resolveProductImage(alert);

    expect(a.url).toBe("https://img/cache.jpg");
    expect(b.url).toBe("https://img/cache.jpg");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates inflight requests for same recall", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 1, product: { image_front_url: "https://img/inflight.jpg" } }), {
        status: 200,
      }),
    );

    const alert = makeAlert("R-9", "UPC 123456789012");
    const [a, b] = await Promise.all([resolveProductImage(alert), resolveProductImage(alert)]);

    expect(a.url).toBe("https://img/inflight.jpg");
    expect(b.url).toBe("https://img/inflight.jpg");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
