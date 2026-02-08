/**
 * Scheduled post types for Nostr CMS scheduling feature
 */

export type ScheduledPostStatus = 'pending' | 'published' | 'failed';

export interface ScheduledPost {
  id: string;
  user_pubkey: string;
  signed_event: NostrEvent;
  kind: number;
  scheduled_for: string; // ISO timestamp
  status: ScheduledPostStatus;
  relays: string[];
  created_at: string;
  published_at?: string;
  error_message?: string;
  retry_count: number;
}

/**
 * Nostr event structure (pre-signed)
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Input for creating a new scheduled post
 */
export interface CreateScheduledPostInput {
  signedEvent: NostrEvent;
  kind: number;
  scheduledFor: Date;
  relays: string[];
  userPubkey: string;
}

/**
 * Summary stats for scheduled posts
 */
export interface ScheduledPostStats {
  pending: number;
  published: number;
  failed: number;
}
