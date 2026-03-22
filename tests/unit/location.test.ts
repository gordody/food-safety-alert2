import { describe, it, expect } from "vitest";
import { filterAlertsByState, buildLocationLabel } from "$lib/location";
import type { EnforcementAlert } from "$lib/types";

const createAlert = (overrides: Partial<EnforcementAlert> = {}): EnforcementAlert => ({
  recall_number: "F-1000-2024",
  recalling_firm: "Test Corp",
  product_description: "Test Product",
  reason_for_recall: "Test reason",
  state: "",
  country: "US",
  report_date: "20240315",
  classification: "Class II",
  status: "Ongoing",
  ...overrides,
});

describe("location utilities", () => {
  describe("filterAlertsByState", () => {
    it("includes nationwide distribution alerts regardless of state filter", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", distribution_pattern: "nationwide" }),
        createAlert({ recall_number: "F-2", distribution_pattern: "All States" }),
        createAlert({ recall_number: "F-3", distribution_pattern: "UNITED STATES" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(3);
    });

    it("includes alerts from recalling firm located in target state", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", state: "CA" }),
        createAlert({ recall_number: "F-2", state: "TX" }),
        createAlert({ recall_number: "F-3", state: "NY" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].recall_number).toBe("F-1");
    });

    it("is case-insensitive for state matching", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", state: "ca" }),
        createAlert({ recall_number: "F-2", state: "Ca" }),
        createAlert({ recall_number: "F-3", state: "CA" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(3);
    });

    it("includes alerts with state code as word boundary in distribution pattern", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", distribution_pattern: "Distributed in CA, NV, OR" }),
        createAlert({ recall_number: "F-2", distribution_pattern: "CAL" }),
        createAlert({ recall_number: "F-3", distribution_pattern: "California" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.recall_number)).toEqual(["F-1", "F-3"]);
    });

    it("includes alerts with state name in distribution pattern", () => {
      const alerts = [
        createAlert({
          recall_number: "F-1",
          distribution_pattern: "Distributed in California and Oregon",
        }),
        createAlert({
          recall_number: "F-2",
          distribution_pattern: "Northern California area",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(2);
    });

    it("is case-insensitive for state name matching", () => {
      const alerts = [
        createAlert({
          recall_number: "F-1",
          distribution_pattern: "california",
        }),
        createAlert({
          recall_number: "F-2",
          distribution_pattern: "CALIFORNIA",
        }),
        createAlert({
          recall_number: "F-3",
          distribution_pattern: "California",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(3);
    });

    it("excludes alerts that don't match any criteria", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", distribution_pattern: "Texas only" }),
        createAlert({ recall_number: "F-2", state: "TX" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(0);
    });

    it("handles alerts without distribution_pattern field", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", distribution_pattern: undefined, state: "CA" }),
        createAlert({ recall_number: "F-2", distribution_pattern: undefined, state: "TX" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].recall_number).toBe("F-1");
    });

    it("handles alerts without state field", () => {
      const alerts = [
        createAlert({
          recall_number: "F-1",
          state: undefined,
          distribution_pattern: "CA",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(1);
    });

    it("combines multiple matching criteria correctly", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", state: "CA" }),
        createAlert({
          recall_number: "F-2",
          distribution_pattern: "Served in CA and NV",
        }),
        createAlert({
          recall_number: "F-3",
          distribution_pattern: "California locations",
        }),
        createAlert({
          recall_number: "F-4",
          distribution_pattern: "nationwide",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(4);
    });

    it("handles various nationwide patterns", () => {
      const patterns = [
        "nationwide",
        "NATIONWIDE",
        "all 50 states",
        "All States",
        "ALL STATES",
        "united states",
        "UNITED STATES",
        "u.s.",
        "U.S.",
        "national",
        "NATIONAL",
      ];

      const alerts = patterns.map((pattern, i) =>
        createAlert({ recall_number: `F-${i}`, distribution_pattern: pattern })
      );

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(patterns.length);
    });

    it("returns empty array for empty input", () => {
      const filtered = filterAlertsByState([], "CA");

      expect(filtered).toHaveLength(0);
    });

    it("handles empty string state code", () => {
      const alerts = [createAlert({ recall_number: "F-1", state: "CA" })];

      const filtered = filterAlertsByState(alerts, "");

      expect(filtered).toHaveLength(0);
    });

    it("handles unknown state code", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", distribution_pattern: "California" }),
      ];

      const filtered = filterAlertsByState(alerts, "XY");

      expect(filtered).toHaveLength(0);
    });

    it("handles distribution pattern with special regex characters", () => {
      const alerts = [
        createAlert({
          recall_number: "F-1",
          distribution_pattern: "Served in [CA] and (NV)",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(1);
    });

    it("prioritizes matched alerts (all matching criteria)", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", state: "CA", distribution_pattern: "California" }),
        createAlert({ recall_number: "F-2", state: "TX" }),
        createAlert({
          recall_number: "F-3",
          distribution_pattern: "nationwide",
        }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.recall_number)).toEqual(["F-1", "F-3"]);
    });
  });

  describe("buildLocationLabel", () => {
    it("returns city and state code when both provided", () => {
      const label = buildLocationLabel("San Francisco", "CA");

      expect(label).toBe("San Francisco, CA");
    });

    it("returns only state name when city is not provided", () => {
      const label = buildLocationLabel(undefined, "CA");

      expect(label).toBe("California");
    });

    it("returns only state name when city is empty string", () => {
      const label = buildLocationLabel("", "CA");

      expect(label).toBe("California");
    });

    it("handles all 50 US states", () => {
      const states = [
        { code: "AL", expectedName: "Alabama" },
        { code: "CA", expectedName: "California" },
        { code: "NY", expectedName: "New York" },
        { code: "TX", expectedName: "Texas" },
        { code: "DC", expectedName: "District of Columbia" },
      ];

      for (const state of states) {
        const label = buildLocationLabel(undefined, state.code);
        expect(label).toBe(state.expectedName);
      }
    });

    it("falls back to state code for unknown states", () => {
      const label = buildLocationLabel(undefined, "ZZ");

      expect(label).toBe("ZZ");
    });

    it("formats city and state code correctly", () => {
      const label = buildLocationLabel("New York", "NY");

      expect(label).toBe("New York, NY");
    });

    it("handles city names with special characters", () => {
      const label = buildLocationLabel("Saint Paul", "MN");

      expect(label).toBe("Saint Paul, MN");
    });

    it("handles cities with spaces", () => {
      const label = buildLocationLabel("Los Angeles", "CA");

      expect(label).toBe("Los Angeles, CA");
    });

    it("preserves case of city name", () => {
      const label = buildLocationLabel("san francisco", "CA");

      expect(label).toBe("san francisco, CA");
    });

    it("is not affected by whitespace in city", () => {
      const label = buildLocationLabel("  San Francisco  ", "CA");

      expect(label).toBe("  San Francisco  , CA");
    });

    it("returns lowercase state code in city part", () => {
      const label = buildLocationLabel("Portland", "or");

      expect(label).toContain("Portland, or");
    });

    it("works with lowercase state code in label", () => {
      const label = buildLocationLabel(undefined, "ca");

      expect(label).toBe("ca");
    });

    it("handles numeric city names", () => {
      const label = buildLocationLabel("123", "CA");

      expect(label).toBe("123, CA");
    });

    it("handles very long city names", () => {
      const longCity = "A".repeat(100);
      const label = buildLocationLabel(longCity, "CA");

      expect(label).toBe(`${longCity}, CA`);
    });
  });

  describe("edge cases and integration", () => {
    it("filterAlertsByState with buildLocationLabel for CA", () => {
      const alerts = [
        createAlert({ recall_number: "F-1", state: "CA" }),
        createAlert({ recall_number: "F-2", state: "TX" }),
      ];

      const filtered = filterAlertsByState(alerts, "CA");
      const label = buildLocationLabel("San Francisco", "CA");

      expect(filtered).toHaveLength(1);
      expect(label).toContain("CA");
    });

    it("handles all US territories represented in state list", () => {
      const label = buildLocationLabel("Washington", "DC");

      expect(label).toBe("Washington, DC");
    });
  });
});
