/**
 * Hook for managing scheduled posts via InsForge backend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insforge } from '@/lib/insforge';
import type {
  ScheduledPost,
  CreateScheduledPostInput,
  ScheduledPostStats,
  NostrEvent,
} from '@/types/scheduled';

const TABLE_NAME = 'scheduled_posts';

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

      let query = insforge.database
        .from(TABLE_NAME)
        .select('*')
        .eq('user_pubkey', userPubkey)
        .order('scheduled_for', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ScheduledPost[];
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

      const { data, error } = await insforge.database
        .from(TABLE_NAME)
        .select('status')
        .eq('user_pubkey', userPubkey);

      if (error) throw error;

      const stats: ScheduledPostStats = {
        pending: 0,
        published: 0,
        failed: 0,
      };

      data?.forEach((post) => {
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

      const { data, error } = await insforge.database
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ScheduledPost;
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
      const { signedEvent, kind, scheduledFor, relays, userPubkey } = input;

      const { data, error } = await insforge.database
        .from(TABLE_NAME)
        .insert({
          user_pubkey: userPubkey,
          signed_event: signedEvent,
          kind,
          scheduled_for: scheduledFor.toISOString(),
          relays,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ScheduledPost;
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
      const { error } = await insforge.database
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) throw error;
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
      const { data, error } = await insforge.database
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ScheduledPost;
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

/**
 * Create a pre-signed Nostr event with a future timestamp
 *
 * Note: This creates the event structure, but signing must be done
 * by the caller using the user's signer.
 */
export function createScheduledEvent(params: {
  kind: number;
  content: string;
  tags?: string[][];
  scheduledAt: Date;
}): Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> {
  const { kind, content, tags = [], scheduledAt } = params;

  return {
    kind,
    content,
    tags,
    created_at: Math.floor(scheduledAt.getTime() / 1000),
  };
}
