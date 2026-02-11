// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AppConfig } from '@/contexts/AppContext';
import { getDefaultRelayUrl } from '@/lib/relay';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds before data is considered stale
      gcTime: 300000, // Keep cache for 5 minutes during navigation
      retry: 1, // Retry once on failure (handles slow relay connections)
    },
  },
});

const DEFAULT_RELAY_URL = getDefaultRelayUrl();

const DEFAULT_PUBLISH_RELAYS = [
  DEFAULT_RELAY_URL,
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol'
].filter(Boolean);

const defaultConfig: AppConfig = {
  theme: "light",
  relayMetadata: {
    relays: [
      { url: DEFAULT_RELAY_URL, read: true, write: true },
    ],
    updatedAt: 0,
  },
  siteConfig: {
    title: 'My Meetup Site',
    logo: '',
    favicon: '',
    ogImage: '',
    heroTitle: 'Welcome to Our Community',
    heroSubtitle: 'Join us for amazing meetups and events',
    heroBackground: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop',
    showEvents: true,
    showBlog: true,
    feedNpubs: [],
    feedReadFromPublishRelays: false,
    maxEvents: 6,
    maxBlogPosts: 3,
    defaultRelay: DEFAULT_RELAY_URL,
    publishRelays: DEFAULT_PUBLISH_RELAYS,
  },
  navigation: [
    { id: '2', name: 'Events', href: '/events', isSubmenu: false },
    { id: '3', name: 'Blog', href: '/blog', isSubmenu: false },
    { id: '6', name: 'Feed', href: '/feed', isSubmenu: false },
    { id: '4', name: 'About', href: '/about', isSubmenu: false },
    { id: '5', name: 'Contact', href: '/contact', isSubmenu: false },
  ],
};

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NostrSync />
              <NWCProvider>
                <TooltipProvider>
                  <Toaster />
                  <Suspense>
                    <AdminAuthProvider>
                      <AppRouter />
                    </AdminAuthProvider>
                  </Suspense>
                </TooltipProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
