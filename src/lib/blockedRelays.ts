/**
 * Blocked relays configuration.
 * These relays are excluded from the relay list due to being unreliable or deprecated.
 */

/** Relays that should be excluded from the relay list */
export const BLOCKED_RELAYS = [
  'wss://relay.snort.social',
  'wss://relay.nostr.band',
];

/** Check if a relay URL is blocked */
export function isBlockedRelay(url: string): boolean {
  const normalized = url.replace(/\/$/, '').toLowerCase();
  return BLOCKED_RELAYS.some(blocked => 
    normalized === blocked.replace(/\/$/, '').toLowerCase()
  );
}
