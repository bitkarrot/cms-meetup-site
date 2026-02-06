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
 * Get the Scheduler API base URL
 */
export function getSchedulerApiUrl(): string {
  return import.meta.env.VITE_SWARM_API_URL || '/api';
}
