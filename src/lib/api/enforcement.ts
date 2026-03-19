import { OPEN_FDA_BASE_URL, MAX_ALERTS } from "$lib/constants";
import { US_STATES } from "$lib/constants";
import type { EnforcementAlert, EnforcementResponse } from "$lib/types";

export async function loadLatestEnforcementAlerts(apiKey?: string): Promise<EnforcementAlert[]> {
  const params = new URLSearchParams({
    limit: String(MAX_ALERTS),
    sort: "report_date:desc"
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  return data.results ?? [];
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

export async function loadLocalizedEnforcementAlerts(
  stateCode: string,
  apiKey?: string,
): Promise<EnforcementAlert[]> {
  const normalizedStateCode = stateCode.trim().toUpperCase();
  if (!normalizedStateCode) return [];

  const params = new URLSearchParams({
    limit: String(MAX_ALERTS),
    sort: "report_date:desc",
    search: buildLocationSearchQuery(normalizedStateCode),
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  const response = await fetch(`${OPEN_FDA_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`FDA API request failed (${response.status})`);
  }

  const data: EnforcementResponse = await response.json();
  return data.results ?? [];
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