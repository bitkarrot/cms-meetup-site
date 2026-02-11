import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

/**
 * Query the default relay pool and fan out to additional NIP-65 relays,
 * merging and deduplicating results by event ID.
 *
 * Used by social components (Feed, Notes, Zaps, Comments, DMs, Profiles)
 * that need to read from multiple relays beyond the default CMS relay.
 *
 * CMS content components should NOT use this — they read from the default
 * relay only via the standard nostr.query() pool.
 */
export async function queryWithNip65Fanout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nostr: any,
  filters: NostrFilter[],
  nip65RelayUrls: string[],
  signal: AbortSignal,
): Promise<NostrEvent[]> {
  const results = await Promise.allSettled([
    nostr.query(filters, { signal }),
    ...nip65RelayUrls.map((url: string) => {
      try {
        const relay = nostr.relay(url);
        return relay.query(filters, { signal });
      } catch {
        return Promise.resolve([] as NostrEvent[]);
      }
    }),
  ]);

  const allEvents = results
    .filter(
      (r): r is PromiseFulfilledResult<NostrEvent[]> =>
        r.status === 'fulfilled',
    )
    .flatMap((r) => r.value);

  // Deduplicate by event ID
  return Array.from(new Map(allEvents.map((e) => [e.id, e])).values());
}

/**
 * Get the list of NIP-65 read relay URLs from relay metadata config.
 * Filters to only relays marked for reading.
 */
export function getNip65ReadRelays(
  relayMetadata?: { relays: Array<{ url: string; read: boolean; write: boolean }> },
): string[] {
  return relayMetadata?.relays?.filter((r) => r.read).map((r) => r.url) || [];
}
