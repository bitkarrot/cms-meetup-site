/**
 * Hook for managing scheduled posts via Swarm Relay Backend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ScheduledPost,
  CreateScheduledPostInput,
  ScheduledPostStats,
  NostrEvent,
} from '@/types/scheduled';
import { Event } from 'nostr-tools';
import { getSchedulerApiUrl } from '@/lib/scheduler';

// API base URL - derived from VITE_SWARM_API_URL or VITE_DEFAULT_RELAY
const API_BASE = getSchedulerApiUrl();

/**
 * Fetch wrapper that adds NIP-98 Authorization header
 */
async function fetchWithNip98(urlStr: string, method: string, body?: any) {
  const url = urlStr.startsWith('http') ? urlStr : `${API_BASE}${urlStr}`;

  // 1. Create event kind 27235
  // We need to access window.nostr for signing
  const nostr = (window as any).nostr;
  if (!nostr) {
    throw new Error('Nostr extension not found');
  }

  const pubkey = await nostr.getPublicKey();

  // Create the event structure
  // content, keys, created_at, kind, tags
  const event = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', url],
      ['method', method],
    ],
    content: '',
    pubkey: pubkey,
  };

  // 2. Sign
  // @ts-ignore
  const signed = await nostr.signEvent(event);

  // 3. Create Authorization header
  const token = btoa(JSON.stringify(signed));

  // 4. Fetch
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Nostr ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} ${text}`);
  }

  // Handle 204 No Content or empty responses
  if (response.status === 204) {
    return null;
  }

  // Only try to parse JSON if there is content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return response.text();
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all scheduled posts for a user
 */
export function useScheduledPosts(userPubkey: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['scheduled-posts', userPubkey, status],
    queryFn: async () => {
      if (!userPubkey) return [];

      const posts = await fetchWithNip98('/scheduler/list', 'GET') as ScheduledPost[];

      // Filter by status if requested (API returns all)
      if (status) {
        return posts.filter(p => p.status === status);
      }

      // Sort by scheduled_for
      return posts.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    },
    enabled: !!userPubkey,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Fetch stats for scheduled posts
 */
export function useScheduledPostsStats(userPubkey: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-posts-stats', userPubkey],
    queryFn: async () => {
      if (!userPubkey) return { pending: 0, published: 0, failed: 0 };

      const posts = await fetchWithNip98('/scheduler/list', 'GET') as ScheduledPost[];

      const stats: ScheduledPostStats = {
        pending: 0,
        published: 0,
        failed: 0,
      };

      posts.forEach((post) => {
        if (post.status in stats) {
          stats[post.status as keyof ScheduledPostStats]++;
        }
      });

      return stats;
    },
    enabled: !!userPubkey,
    refetchInterval: 30000,
  });
}

/**
 * Fetch a single scheduled post by ID
 */
export function useScheduledPost(id: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-post', id],
    queryFn: async () => {
      if (!id) return null;
      // Inefficient but API doesn't support get-by-id yet
      // We list all and find one. 
      const posts = await fetchWithNip98('/scheduler/list', 'GET') as ScheduledPost[];
      const post = posts.find(p => p.id === id);
      if (!post) throw new Error('Post not found');
      return post;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new scheduled post
 */
export function useCreateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduledPostInput) => {
      const { signedEvent, relays, scheduledFor } = input;

      const body = {
        signed_event: signedEvent,
        relays,
        scheduled_for: scheduledFor.toISOString(),
      };

      const result = await fetchWithNip98('/scheduler/schedule', 'POST', body);
      return result as ScheduledPost;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-posts', variables.userPubkey],
      });
      queryClient.invalidateQueries({
        queryKey: ['scheduled-posts-stats', variables.userPubkey],
      });
    },
  });
}

/**
 * Delete a scheduled post
 */
export function useDeleteScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userPubkey }: { id: string; userPubkey: string }) => {
      await fetchWithNip98(`/scheduler/delete?id=${id}`, 'DELETE');
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-posts', variables.userPubkey],
      });
      queryClient.invalidateQueries({
        queryKey: ['scheduled-posts-stats', variables.userPubkey],
      });
    },
  });
}

/**
 * Update a scheduled post (for rescheduling)
 * Implemented as Delete old + Create new
 */
export function useUpdateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      userPubkey,
      updates,
    }: {
      id: string;
      userPubkey: string;
      updates: Partial<ScheduledPost>;
    }) => {

      // 1. Delete old post
      await fetchWithNip98(`/scheduler/delete?id=${id}`, 'DELETE');

      // 2. Create new post
      if (!updates.signed_event || !updates.scheduled_for || !updates.relays) {
        throw new Error("Missing required fields for update (signed_event, scheduled_for, relays)");
      }

      const body = {
        signed_event: updates.signed_event,
        relays: updates.relays,
        scheduled_for: updates.scheduled_for,
      };

      const result = await fetchWithNip98('/scheduler/schedule', 'POST', body);
      return result as ScheduledPost;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-posts', variables.userPubkey],
      });
      queryClient.invalidateQueries({
        queryKey: ['scheduled-post', variables.id],
      });
    },
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate time remaining until scheduled publish
 */
export function getTimeRemaining(scheduledFor: string): {
  text: string;
  isPast: boolean;
  seconds: number;
} {
  const now = new Date();
  const scheduled = new Date(scheduledFor);
  const diff = scheduled.getTime() - now.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds <= 0) {
    return { text: 'Due now', isPast: true, seconds: 0 };
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return {
      text: `in ${days} day${days > 1 ? 's' : ''}`,
      isPast: false,
      seconds,
    };
  }

  if (hours > 0) {
    return {
      text: `in ${hours} hour${hours > 1 ? 's' : ''}`,
      isPast: false,
      seconds,
    };
  }

  if (minutes > 0) {
    return {
      text: `in ${minutes} minute${minutes > 1 ? 's' : ''}`,
      isPast: false,
      seconds,
    };
  }

  return {
    text: `in ${seconds} second${seconds > 1 ? 's' : ''}`,
    isPast: false,
    seconds,
  };
}
