/**
 * Scheduler Configuration
 * 
 * Checks if the scheduler feature is enabled.
 * Now served by the Swarm Relay backend.
 */

/**
 * Check if Scheduler is enabled/configured.
 * 
 * Since moving to Swarm, this is generally always true if the backend supports it.
 * We can optionally check for VITE_SWARM_API_URL, but defaulting to true 
 * allows it to work out-of-the-box with local relays.
 */
export function isSchedulerEnabled(): boolean {
  // Always enabled by default in Swarm
  return true;
}

/**
 * Derive the HTTP(S) API base URL from VITE_DEFAULT_RELAY.
 * Converts wss:// → https:// and ws:// → http://, then appends /api.
 * Falls back to /api for local dev proxy when no relay is configured.
 */
function deriveApiUrlFromRelay(): string {
  const relay = import.meta.env.VITE_DEFAULT_RELAY;
  if (!relay) return '/api';
  const httpUrl = relay
    .replace(/\/$/, '')
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://');
  return `${httpUrl}/api`;
}

/**
 * Get the Scheduler API base URL
 */
export function getSchedulerApiUrl(): string {
  return import.meta.env.VITE_SWARM_API_URL || deriveApiUrlFromRelay();
}
