import { describe, expect, it } from "vitest";

import { extractProductName, formatDate, formatLocation } from "$lib/utils";

describe("formatDate", () => {
  it("returns Unknown date for empty values", () => {
    expect(formatDate("")).toBe("Unknown date");
  });

  it("returns Unknown date for malformed lengths", () => {
    expect(formatDate("2024-01-01")).toBe("Unknown date");
    expect(formatDate("202401")).toBe("Unknown date");
  });

  it("formats a valid YYYYMMDD date", () => {
    const formatted = formatDate("20240215");

    expect(formatted).not.toBe("Unknown date");
    expect(formatted).toContain("2024");
  });

  it("returns Unknown date for out-of-range year", () => {
    // Year 275761 and beyond cause NaN in Date.getTime()
    expect(formatDate("2757611231")).toBe("Unknown date");
  });
});

describe("extractProductName", () => {
  it("returns fallback for empty product description", () => {
    expect(extractProductName("")).toBe("FDA Enforcement Alert");
  });

  it("returns fallback for null-like values", () => {
    expect(extractProductName(null as any)).toBe("FDA Enforcement Alert");
    expect(extractProductName(undefined as any)).toBe("FDA Enforcement Alert");
  });

  it("extracts text up to the first non-alpha character after the first 5 chars", () => {
    expect(extractProductName("APPLE JUICE - UPC 12345")).toBe("APPLE JUICE");
  });

  it("does not split on non-alpha characters inside the first 5 characters", () => {
    expect(extractProductName("AB-12 CEREAL / LOT-8")).toBe("AB-12 CEREAL");
  });

  it("truncates to 50 characters with ellipsis when delimiter appears after 50", () => {
    const input = `${"A".repeat(60)}-LOT`;
    expect(extractProductName(input)).toBe(`${"A".repeat(50)}...`);
  });

  it("truncates to 50 characters with ellipsis when there is no delimiter and text is long", () => {
    const input = "A".repeat(55);
    expect(extractProductName(input)).toBe(`${"A".repeat(50)}...`);
  });

  it("returns product name with only whitespace padding trimmed", () => {
    expect(extractProductName("  APPLE  JUICE  ")).toBe("APPLE  JUICE");
  });

  it("returns fallback when product description is only whitespace", () => {
    expect(extractProductName("     ")).toBe("FDA Enforcement Alert");
  });

  it("returns product name that ends with alphanumeric", () => {
    // "ABCDE" (5 chars) + "FGH123" - first digit "1" at index 3 of trailingSegment (index 8 overall)
    // So it extracts "ABCDE" + "FGH" = "ABCDEFGH"
    expect(extractProductName("ABCDEFGH123")).toBe("ABCDEFGH");
  });
});

describe("formatLocation", () => {
  it("returns city/state/country when present", () => {
    expect(formatLocation("Austin", "TX", "USA")).toBe("Austin, TX, USA");
  });

  it("combines geographic location and distribution pattern", () => {
    expect(formatLocation("Austin", "TX", "USA", "Distributed in the US")).toBe(
      "Austin, TX, USA | Distributed in the US"
    );
  });

  it("returns only distribution pattern when geography is missing", () => {
    expect(formatLocation(undefined, undefined, undefined, "Nationwide")).toBe("Nationwide");
  });

  it("returns fallback when all location fields are missing", () => {
    expect(formatLocation()).toBe("Location not provided");
  });

  it("handles partial geographic data (city and state only)", () => {
    expect(formatLocation("Boston", "MA")).toBe("Boston, MA");
  });

  it("handles partial geographic data (state and country only)", () => {
    expect(formatLocation(undefined, "CA", "USA")).toBe("CA, USA");
  });

  it("handles single city with distribution pattern", () => {
    expect(formatLocation("Denver", undefined, undefined, "Mountain region")).toBe(
      "Denver | Mountain region"
    );
  });

  it("ignores empty string values and filters them out", () => {
    expect(formatLocation("", "TX", "")).toBe("TX");
  });

  it("trims whitespace from geographic values", () => {
    expect(formatLocation("  Austin  ", "  TX  ", "  USA  ")).toBe("Austin, TX, USA");
  });

  it("trims whitespace from distribution pattern", () => {
    expect(formatLocation(undefined, undefined, undefined, "  Nationwide  ")).toBe("Nationwide");
  });
});
