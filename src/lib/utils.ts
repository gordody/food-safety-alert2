export function formatDate(rawDate: string): string {
  if (!rawDate || rawDate.length !== 8) return "Unknown date";

  const year = Number(rawDate.slice(0, 4));
  const month = Number(rawDate.slice(4, 6));
  const day = Number(rawDate.slice(6, 8));
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function extractProductName(productDescription: string): string {
  const normalized = productDescription?.trim() ?? "";
  if (!normalized) return "FDA Enforcement Alert";

  const minimumNameLength = 5;
  const leadingSegment = normalized.slice(0, minimumNameLength);
  const trailingSegment = normalized.slice(minimumNameLength);
  const firstNonAlphabeticalInTrailing = trailingSegment.search(/[^A-Za-z\s]/);
  const firstNonAlphabeticalIndex =
    firstNonAlphabeticalInTrailing === -1
      ? -1
      : minimumNameLength + firstNonAlphabeticalInTrailing;

  if (firstNonAlphabeticalIndex === -1) {
    return normalized.length > 50 ? `${normalized.slice(0, 50).trim()}...` : normalized;
  }

  if (firstNonAlphabeticalIndex > 50) {
    return `${normalized.slice(0, 50).trim()}...`;
  }

  if (firstNonAlphabeticalIndex === 0) {
    return normalized.length > 50 ? `${normalized.slice(0, 50).trim()}...` : normalized;
  }

  const candidate = `${leadingSegment}${normalized.slice(minimumNameLength, firstNonAlphabeticalIndex)}`.trim();
  return candidate || "FDA Enforcement Alert";
}

export function formatLocation(
  city?: string,
  state?: string,
  country?: string,
  distributionPattern?: string
): string {
  const geographic = [city, state, country].map((value) => value?.trim()).filter(Boolean).join(", ");
  const distribution = distributionPattern?.trim();

  if (geographic && distribution) return `${geographic} | ${distribution}`;
  if (geographic) return geographic;
  if (distribution) return distribution;

  return "Location not provided";
}
