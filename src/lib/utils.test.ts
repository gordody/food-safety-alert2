import { describe, expect, it } from "vitest";

import { extractProductName, formatDate, formatLocation } from "./utils";

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
});

describe("extractProductName", () => {
  it("returns fallback for empty product description", () => {
    expect(extractProductName("")).toBe("FDA Enforcement Alert");
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
});
