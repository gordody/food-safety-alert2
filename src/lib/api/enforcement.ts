import { OPEN_FDA_BASE_URL, MAX_ALERTS } from "$lib/constants";
import { US_STATES } from "$lib/constants";
import type { EnforcementAlert, EnforcementResponse } from "$lib/types";

export type CustomAlertSearchOptions = {
  location?: string;
  keywords?: string;
  reportDateFrom?: string;
  reportDateTo?: string;
};

export async function loadLatestEnforcementAlerts(apiKey?: string, skip: number = 0): Promise<{ alerts: EnforcementAlert[]; totalResults: number }> {
  const params = new URLSearchParams({
    limit: String(MAX_ALERTS),
    sort: "report_date:desc",
    skip: String(skip),
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  const totalResults = data.meta?.results?.total ?? 0;
  return { alerts: data.results ?? [], totalResults };
}

function buildLocationSearchQuery(stateCode: string): string {
  const normalizedStateCode = stateCode.trim().toUpperCase();
  const stateName = US_STATES.find((s) => s.code === normalizedStateCode)?.name;

  const distributionClauses = [
    `distribution_pattern:*${normalizedStateCode}*`,
    "distribution_pattern:*nationwide*",
    "distribution_pattern:*all states*",
    "distribution_pattern:*all 50 states*",
    "distribution_pattern:*united states*",
  ];

  if (stateName) {
    distributionClauses.push(`distribution_pattern:*${stateName}*`);
  }

  return [`state:${normalizedStateCode}`, ...distributionClauses].join(" OR ");
}

function sanitizeSearchToken(value: string): string {
  // Escape quote and backslash for openFDA/Lucene-style search syntax.
  return value.replace(/["\\]/g, "").trim();
}

function tokenizeFilterInput(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => sanitizeSearchToken(token))
    .filter(Boolean);
}

function normalizeDateForOpenFda(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{8}$/.test(trimmed)) return trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed.replace(/-/g, "");
}

function buildCustomSearchQuery(options: CustomAlertSearchOptions): string {
  const clauses: string[] = [];

  const locationTokens = tokenizeFilterInput(options.location ?? "");
  if (locationTokens.length > 0) {
    const locationClauses = locationTokens.map(
      (token) =>
        `((city:*${token}*) OR (state:*${token}*) OR (country:*${token}*) OR (distribution_pattern:*${token}*))`,
    );
    clauses.push(`(${locationClauses.join(" AND ")})`);
  }

  const keywordTokens = tokenizeFilterInput(options.keywords ?? "");
  if (keywordTokens.length > 0) {
    const keywordClauses = keywordTokens.map(
      (token) =>
        `((product_description:*${token}*) OR (reason_for_recall:*${token}*) OR (recalling_firm:*${token}*) OR (distribution_pattern:*${token}*))`,
    );
    clauses.push(`(${keywordClauses.join(" AND ")})`);
  }

  const normalizedFrom = normalizeDateForOpenFda(options.reportDateFrom);
  const normalizedTo = normalizeDateForOpenFda(options.reportDateTo);
  if (normalizedFrom || normalizedTo) {
    const from = normalizedFrom ?? "19000101";
    const to = normalizedTo ?? "29991231";
    const [start, end] = from <= to ? [from, to] : [to, from];
    clauses.push(`report_date:[${start} TO ${end}]`);
  }

  return clauses.join(" AND ");
}

export async function loadLocalizedEnforcementAlerts(
  stateCode: string,
  apiKey?: string,
  skip: number = 0,
): Promise<{ alerts: EnforcementAlert[]; totalResults: number }> {
  const normalizedStateCode = stateCode.trim().toUpperCase();
  if (!normalizedStateCode) return { alerts: [], totalResults: 0 };

  const params = new URLSearchParams({
    limit: String(MAX_ALERTS),
    sort: "report_date:desc",
    search: buildLocationSearchQuery(normalizedStateCode),
    skip: String(skip),
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  const totalResults = data.meta?.results?.total ?? 0;
  return { alerts: data.results ?? [], totalResults };
}

export async function loadEnforcementAlertByRecallNumber(
  recallNumber: string,
  apiKey?: string,
): Promise<EnforcementAlert | null> {
  const params = new URLSearchParams({
    limit: "1",
    search: `recall_number:\"${recallNumber}\"`,
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  return data.results?.[0] ?? null;
}

export async function loadCustomEnforcementAlerts(
  options: CustomAlertSearchOptions,
  apiKey?: string,
  skip: number = 0,
): Promise<{ alerts: EnforcementAlert[]; totalResults: number }> {
  const params = new URLSearchParams({
    limit: String(MAX_ALERTS),
    sort: "report_date:desc",
    skip: String(skip),
  });

  const search = buildCustomSearchQuery(options);
  if (search) {
    params.set("search", search);
  }

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  const totalResults = data.meta?.results?.total ?? 0;
  return { alerts: data.results ?? [], totalResults };
}