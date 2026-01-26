import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      // Try primary relays first
      let [event] = await nostr.query(
        [{ kinds: [0], authors: [pubkey!], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) },
      );

      // If no event found, try purplepag.es
      if (!event) {
        try {
          const purplePagesRelay = 'wss://purplepag.es';
          const [purpleEvent] = await nostr.query(
            [{ kinds: [0], authors: [pubkey!], limit: 1 }],
            { 
              signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
              relays: [purplePagesRelay]
            },
          );
          if (purpleEvent) {
            event = purpleEvent;
          }
        } catch (error) {
          console.error('Failed to query purplepages:', error);
        }
      }

      if (!event) {
        throw new Error('No event found');
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        return { metadata, event };
      } catch {
        return { event };
      }
    },
    staleTime: 5 * 60 * 1000, // Keep cached data fresh for 5 minutes
    retry: 3,
  });
}
