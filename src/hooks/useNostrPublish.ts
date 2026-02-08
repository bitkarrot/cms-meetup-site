import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

export function useNostrPublish(): UseMutationResult<NostrEvent, Error, { event: { kind: number; content?: string; tags?: string[][]; created_at?: number }; relays?: string[] }> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ event: t, relays }) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
          tags.push(["client", location.hostname]);
        }

        const signedEvent = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        if (relays && relays.length > 0) {
          // Publish to specific relays if provided
          await Promise.allSettled(
            relays.map(url => {
              try {
                // Check if nostr is a pool-like object with a relay() method
                const pool = nostr as unknown as { relay: (url: string) => { event: (e: NostrEvent, options?: { signal?: AbortSignal }) => Promise<void> } };
                const r = typeof pool.relay === 'function' ? pool.relay(url) : (nostr as { event: (e: NostrEvent, options?: { signal?: AbortSignal }) => Promise<void> });
                return r.event(signedEvent, { signal: AbortSignal.timeout(5000) });
              } catch (e) {
                console.error(`Failed to publish to ${url}:`, e);
                return Promise.reject(e);
              }
            })
          );
        } else {
          // Default publish (to all pool relays)
          await (nostr as { event: (e: NostrEvent, options?: { signal?: AbortSignal }) => Promise<void> }).event(signedEvent, { signal: AbortSignal.timeout(5000) });
        }

        return signedEvent;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}