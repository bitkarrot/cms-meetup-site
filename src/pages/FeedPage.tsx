import { useMemo, useEffect } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { type NostrEvent } from '@nostrify/nostrify';
import { useInView } from 'react-intersection-observer';
import { useSeoMeta } from '@unhead/react';
import { LayoutGrid, Rss, AlertCircle, Loader2 } from 'lucide-react';

import { useAppContext } from '@/hooks/useAppContext';
import { queryWithNip65Fanout, getNip65ReadRelays } from '@/lib/queryRelays';
import Navigation from '@/components/Navigation';
import { FeedItem } from '@/components/FeedItem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { normalizeToHexPubkeys } from '@/lib/utils';

export default function FeedPage() {
  const { config } = useAppContext();
  const { nostr } = useNostr();

  const siteConfig = config.siteConfig;

  const nip65ReadRelays = getNip65ReadRelays(config.relayMetadata);

  const { feedNpubs, readFromPublishRelays, publishRelays } = useMemo(() => ({
    feedNpubs: siteConfig?.feedNpubs || [],
    readFromPublishRelays: siteConfig?.feedReadFromPublishRelays || false,
    publishRelays: siteConfig?.publishRelays || []
  }), [siteConfig?.feedNpubs, siteConfig?.feedReadFromPublishRelays, siteConfig?.publishRelays]);

  const pubkeys = useMemo(() => {
    const pks = normalizeToHexPubkeys(feedNpubs);
    return pks;
  }, [feedNpubs]);

  const { ref: loadMoreRef, inView } = useInView();

  const {
    data: notesData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<NostrEvent[], Error, InfiniteData<NostrEvent[]>, any, number | undefined>({
    queryKey: ['feed-notes', pubkeys, readFromPublishRelays, publishRelays],
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const until = pageParam;
      if (pubkeys.length === 0) return [];

      const filter = {
        kinds: [1],
        authors: pubkeys,
        limit: 25,
        until
      };

      const signal = AbortSignal.timeout(10000);

      let events: NostrEvent[] = [];

      try {
        // Always fan out to NIP-65 relays (feed is social data that lives across relays)
        // Combine NIP-65 relays with publish relays if the toggle is enabled
        const additionalRelays = new Set<string>(nip65ReadRelays);
        if (readFromPublishRelays && publishRelays.length > 0) {
          publishRelays.forEach((url: string) => additionalRelays.add(url));
        }

        events = await queryWithNip65Fanout(nostr, [filter], [...additionalRelays], signal);
      } catch (err) {
        console.error('[FeedPage] Global query error:', err);
        throw err;
      }

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 25) return undefined;
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    enabled: pubkeys.length > 0,
    staleTime: 60000, // 1 minute
  });

  const notes = useMemo(() => {
    return notesData?.pages.flat() || [];
  }, [notesData]);

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useSeoMeta({
    title: `Feed - ${config.siteConfig?.title || 'Community'}`,
    description: "Stay updated with latest notes from our community.",
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
            <p className="text-muted-foreground">
              Latest updates from selected community members
            </p>
          </div>
          <Rss className="h-8 w-8 text-primary opacity-50" />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-40" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Error loading feed</h3>
                <p className="text-muted-foreground">There was a problem fetching the latest notes.</p>
              </div>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        ) : pubkeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <LayoutGrid className="h-12 w-12 text-muted-foreground opacity-50" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No feed sources configured</h3>
                <p className="text-muted-foreground">The admin hasn't added any npubs to the feed yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Rss className="h-12 w-12 text-muted-foreground opacity-50" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No notes found</h3>
                <p className="text-muted-foreground">The configured users haven't posted any notes yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <FeedItem key={note.id} event={note} />
            ))}

            {/* Infinite scroll marker */}
            {notes.length > 0 && (
              <div ref={loadMoreRef} className="py-12 flex flex-col items-center justify-center gap-4">
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading more notes...</p>
                  </>
                ) : hasNextPage ? (
                  <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/30 animate-shimmer" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 opacity-40">
                    <div className="h-px w-12 bg-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">End of Feed</p>
                    <div className="h-px w-12 bg-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
