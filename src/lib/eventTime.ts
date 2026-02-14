export function parseNostrEventTime(value?: string): number | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

    // Milliseconds timestamps (13 digits) -> seconds
    if (numeric > 1_000_000_000_000) {
      return Math.floor(numeric / 1000);
    }

    // Seconds timestamps (10 digits)
    return numeric;
  }

  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) return undefined;

  return Math.floor(parsedMs / 1000);
}

export function parseCalendarEventStartEnd(
  kind: number,
  startTag: string | undefined,
  endTag: string | undefined,
  fallbackStart: number,
): { start: number; end?: number } {
  if (kind === 31922) {
    // Date-based event tags are usually YYYY-MM-DD, but we accept timestamps too.
    const start = parseNostrEventTime(startTag) ?? fallbackStart;
    const end = parseNostrEventTime(endTag);
    return { start, end };
  }

  // Time-based event tags are usually unix seconds, but we accept ISO/date strings too.
  const start = parseNostrEventTime(startTag) ?? fallbackStart;
  const end = parseNostrEventTime(endTag);
  return { start, end };
}
