/**
 * Swarm runtime config utilities.
 *
 * The Go server injects a <meta name="swarm-config"> tag into index.html at serve time,
 * providing runtime values (masterPubkey, relayName) without requiring build-time
 * Vite environment variables. Uses <meta> to avoid CSP inline script violations.
 * Build-time VITE_* vars still work as overrides.
 */

interface SwarmConfig {
  masterPubkey?: string;
  relayName?: string;
}

/** Read the server-injected config from <meta name="swarm-config"> tag.
 *  The Go server injects this into index.html at serve time.
 *  Uses <meta> instead of inline <script> to avoid CSP violations. */
function getSwarmConfig(): SwarmConfig {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="swarm-config"]');
    if (meta) {
      try {
        return JSON.parse(meta.getAttribute('content') || '{}') as SwarmConfig;
      } catch {
        return {};
      }
    }
  }
  return {};
}

/**
 * Get the master/admin pubkey.
 * Priority: VITE_MASTER_PUBKEY env var → server-injected __SWARM_CONFIG__
 */
export function getMasterPubkey(): string {
  const envPubkey = import.meta.env.VITE_MASTER_PUBKEY;
  if (envPubkey) return envPubkey.toLowerCase().trim();

  const injected = getSwarmConfig().masterPubkey;
  if (injected) return injected.toLowerCase().trim();

  return '';
}

/**
 * Get the default relay WebSocket URL.
 * Priority: VITE_DEFAULT_RELAY env var → auto-derive from window.location
 */
export function getDefaultRelayUrl(): string {
  const envRelay = import.meta.env.VITE_DEFAULT_RELAY;
  if (envRelay) return envRelay;

  // Auto-derive from current domain (same-domain Swarm deployment)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  // SSR/build-time fallback
  return 'ws://localhost:3334';
}

/**
 * Derive the HTTP(S) API base URL from the relay URL.
 * Converts wss:// → https:// and ws:// → http://, then appends /api.
 * Falls back to /api for same-domain deployments when no relay env var is set.
 */
/**
 * Get the relay-scoped d-tag for site config (Kind 30078).
 * Each site deployment gets its own config event by including the relay URL in the d-tag.
 * This prevents cross-site config bleed when the same master pubkey manages multiple sites.
 */
export function getSiteConfigDTag(): string {
  const relay = getDefaultRelayUrl();
  return `nostr-meetup-site-config:${relay}`;
}

/** The legacy unscoped d-tag, used as migration fallback. */
export const LEGACY_SITE_CONFIG_DTAG = 'nostr-meetup-site-config';

export function getApiBaseUrl(): string {
  const envSwarmApi = import.meta.env.VITE_SWARM_API_URL;
  if (envSwarmApi) return envSwarmApi;

  // If no explicit relay env var, use relative /api (same-domain)
  if (!import.meta.env.VITE_DEFAULT_RELAY) return '/api';

  // Derive from explicit relay URL
  const relay = getDefaultRelayUrl();
  const httpUrl = relay
    .replace(/\/$/, '')
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://');
  return `${httpUrl}/api`;
}
