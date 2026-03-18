import type { EnforcementAlert } from "$lib/types";

export type ResolvedProductImage = {
  url: string | null;
  source: "override" | "openfoodfacts" | "none";
  confidence: number;
  gtin?: string;
};

// Step 1: manual recall-specific overrides.
// Add curated mappings here as they are verified.
const manualImageOverridesByRecall: Record<string, string> = {
  // Example:
  // "F-1234-2026": "https://cdn.example.com/recalls/F-1234-2026.jpg",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedValue = {
  value: ResolvedProductImage;
  expiresAt: number;
};

const imageCache = new Map<string, CachedValue>();
const inflight = new Map<string, Promise<ResolvedProductImage>>();

function nowMs(): number {
  return Date.now();
}

function getCacheKey(alert: EnforcementAlert): string {
  return alert.recall_number;
}

function getCached(cacheKey: string): ResolvedProductImage | null {
  const entry = imageCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    imageCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCached(cacheKey: string, value: ResolvedProductImage): void {
  const ttl = value.url ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
  imageCache.set(cacheKey, {
    value,
    expiresAt: nowMs() + ttl,
  });
}

function normalizeGtin(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function extractGtinCandidates(input: string): string[] {
  const matches = input.match(/\b\d{8,14}\b/g) ?? [];
  const unique = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeGtin(match);
    if (normalized) unique.add(normalized);
  }

  // Prefer common UPC/EAN lengths first.
  return [...unique].sort((a, b) => {
    const aScore = a.length === 12 || a.length === 13 || a.length === 14 ? 0 : 1;
    const bScore = b.length === 12 || b.length === 13 || b.length === 14 ? 0 : 1;
    if (aScore !== bScore) return aScore - bScore;
    return a.length - b.length;
  });
}

async function fetchOpenFoodFactsImage(gtin: string): Promise<string | null> {
  const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`;
  const response = await fetch(endpoint);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    status?: number;
    product?: {
      image_front_url?: string;
      image_url?: string;
      image_small_url?: string;
    };
  };

  if (data.status !== 1) return null;

  return data.product?.image_front_url ?? data.product?.image_url ?? data.product?.image_small_url ?? null;
}

async function resolveUncached(alert: EnforcementAlert): Promise<ResolvedProductImage> {
  const overrideUrl = manualImageOverridesByRecall[alert.recall_number];
  if (overrideUrl) {
    return {
      url: overrideUrl,
      source: "override",
      confidence: 1,
    };
  }

  const candidates = extractGtinCandidates(alert.product_description ?? "").slice(0, 3);

  for (const gtin of candidates) {
    try {
      const url = await fetchOpenFoodFactsImage(gtin);
      if (url) {
        return {
          url,
          source: "openfoodfacts",
          confidence: 0.75,
          gtin,
        };
      }
    } catch {
      // Best effort lookup: ignore provider/network failures.
    }
  }

  return {
    url: null,
    source: "none",
    confidence: 0,
  };
}

export async function resolveProductImage(alert: EnforcementAlert): Promise<ResolvedProductImage> {
  const cacheKey = getCacheKey(alert);

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    const resolved = await resolveUncached(alert);
    setCached(cacheKey, resolved);
    inflight.delete(cacheKey);
    return resolved;
  })();

  inflight.set(cacheKey, task);
  return task;
}

export async function prefetchProductImages(
  alerts: EnforcementAlert[],
  options?: { concurrency?: number },
): Promise<void> {
  if (alerts.length === 0) return;

  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 4, 8));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < alerts.length) {
      const index = cursor;
      cursor += 1;
      const alert = alerts[index];

      try {
        await resolveProductImage(alert);
      } catch {
        // Best-effort prefetch should never break the caller flow.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, alerts.length) }, () => worker()));
}

export function getManualImageOverrides(): Record<string, string> {
  return { ...manualImageOverridesByRecall };
}
