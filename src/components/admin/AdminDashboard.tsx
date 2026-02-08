import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, X, BookOpen, WifiOff, Filter } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDefaultRelay } from '@/hooks/useDefaultRelay';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { NostrFilter } from '@nostrify/nostrify';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRemoteNostrJson } from '@/hooks/useRemoteNostrJson';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AdminDashboard() {
  const { nostr } = useDefaultRelay();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useLocalStorage('admin-dashboard-readme-dismissed', false);
  const [isCollapsed, setIsCollapsed] = useLocalStorage('admin-dashboard-readme-collapsed', false);
  const { data: remoteNostrJson } = useRemoteNostrJson();
  const [filterByNostrJson, setFilterByNostrJson] = useState(false);

  const { data: blogPosts, isLoading: isLoadingBlogs, error: blogError } = useQuery({
    queryKey: ['admin-blog-posts', user?.pubkey],
    queryFn: async () => {
      const signal = AbortSignal.timeout(5000);
      const filters: NostrFilter[] = [{ kinds: [30023], limit: 50 }];

      if (user?.pubkey) {
        filters.push({ kinds: [31234], authors: [user.pubkey], '#k': ['30023'], limit: 20 });
      }

      const events = await nostr!.query(filters, { signal });

      // Defensive filter to ensure only kind 30023 or kind 31234 with k=30023 are included
      return events.filter(event =>
        event.kind === 30023 ||
        (event.kind === 31234 && event.tags.some(([name, value]) => name === 'k' && value === '30023'))
      );
    },
    enabled: !!nostr,
  });

  // Fetch events (kind 31922/31923 - Calendar events)
  const { data: events, isLoading: isLoadingEvents, error: eventError } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const signal = AbortSignal.timeout(5000);
      const events = await nostr!.query([
        { kinds: [31922, 31923], limit: 50 }
      ], { signal });
      return events;
    },
    enabled: !!nostr,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
  };

  const relayError = blogError || eventError;

  // Filter data based on nostr.json users
  const filteredBlogPosts = filterByNostrJson && remoteNostrJson?.names
    ? blogPosts?.filter(post => {
      const normalizedPubkey = post.pubkey.toLowerCase().trim();
      return Object.values(remoteNostrJson.names).some(
        pubkey => pubkey.toLowerCase().trim() === normalizedPubkey
      );
    })
    : blogPosts;

  const filteredEvents = filterByNostrJson && remoteNostrJson?.names
    ? events?.filter(event => {
      const normalizedPubkey = event.pubkey.toLowerCase().trim();
      return Object.values(remoteNostrJson.names).some(
        pubkey => pubkey.toLowerCase().trim() === normalizedPubkey
      );
    })
    : events;

  const stats = [
    {
      title: 'Blog Posts',
      value: filteredBlogPosts?.length || 0,
      icon: FileText,
      description: 'Published articles & drafts',
    },
    {
      title: 'Events',
      value: filteredEvents?.length || 0,
      icon: Calendar,
      description: 'Scheduled meetups',
    },
  ];

  return (
    <div className="space-y-6">
      {relayError && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <WifiOff className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">Relay Disconnected</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Unable to connect to the default relay. Please make sure your relay is running and accessible.
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-3 h-7"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isDismissed && (
        <Alert className="bg-orange-600 border-orange-700 text-white shadow-md relative pr-20">
          <AlertTriangle className="h-5 w-5 !text-white" />
          <div className="flex items-center justify-between w-full">
            <AlertTitle className="text-lg font-bold ml-2">README FIRST</AlertTitle>
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-orange-100 hover:text-white transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-orange-100 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <AlertDescription className="mt-2 text-orange-50 space-y-2">
              <p>
                This is <span className="font-bold">NOT a normal nostr client</span>, this is a CMS, a content manager system for an organization.
              </p>
              <p>
                In <Link to="/admin/system-settings" className="underline font-bold hover:text-white">Admin Settings</Link>, The default relay set is the single source of truth for all content on the public facing side of the site, visible by <Link to="/"  className="underline font-bold hover:text-white">View Site</Link>.
                The additional relays are modifiable and used for broadcasting your notes, blogs, events to other relays.
                Existing, previous content on other relays will not show here unless it exists on the default relay.
              </p>
              <p>
                If you want to sync existing your content to the default relay, you can use the <Link to="/admin/sync-content" className="underline font-bold hover:text-white">Sync Content</Link> section.
                User level access control is also managed in <Link to="/admin/system-settings" className="underline font-bold hover:text-white">Admin Settings</Link>,
                and different users have different publishing permissions as outlined in the <Link to="/admin/help" className="underline font-bold hover:text-white">Help</Link> section.
              </p>
            </AlertDescription>
          )}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your site admin panel. Here's an overview of your content.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Switch
              id="filter-nostr-json-dashboard"
              checked={filterByNostrJson}
              onCheckedChange={setFilterByNostrJson}
            />
            <Label htmlFor="filter-nostr-json-dashboard" className="text-sm cursor-pointer flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Show only users from nostr.json
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDismissed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDismissed(false)}
              className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <BookOpen className="h-4 w-4" />
              Show Readme
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingBlogs || isLoadingEvents}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Blog Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredBlogPosts?.slice(0, 5).map((post) => {
                const tags = post.tags || [];
                let title = tags.find(([name]) => name === 'title')?.[1] || 'Untitled';
                let published = tags.find(([name]) => name === 'published')?.[1] === 'true' || !tags.find(([name]) => name === 'published');

                if (post.kind === 31234) {
                  published = false;
                  title = '[Private Draft]';
                  // Note: We're not decrypting here for simplicity in the dashboard list
                  // But we show that it is a private draft
                }

                return (
                  <div key={post.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Kind {post.kind}
                      </Badge>
                      <Badge variant={published ? 'default' : 'secondary'}>
                        {published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {(!filteredBlogPosts || filteredBlogPosts.length === 0) && (
                <p className="text-sm text-muted-foreground">No blog posts yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEvents?.slice(0, 5).map((event) => {
                const tags = event.tags || [];
                const title = tags.find(([name]) => name === 'title')?.[1] || 'Untitled Event';
                const startTag = tags.find(([name]) => name === 'start')?.[1];
                const status = tags.find(([name]) => name === 'status')?.[1] || 'confirmed';

                let dateDisplay = 'No date';
                if (startTag) {
                  if (event.kind === 31922) {
                    // Date-based: YYYY-MM-DD
                    dateDisplay = new Date(startTag).toLocaleDateString();
                  } else {
                    // Time-based: unix timestamp
                    dateDisplay = new Date(parseInt(startTag) * 1000).toLocaleDateString();
                  }
                }

                return (
                  <div key={event.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateDisplay}
                      </p>
                    </div>
                    <Badge variant={status === 'confirmed' ? 'default' : 'secondary'}>
                      {status}
                    </Badge>
                  </div>
                );
              })}
              {(!filteredEvents || filteredEvents.length === 0) && (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}