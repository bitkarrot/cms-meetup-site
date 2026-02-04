/**
 * InsForge SDK Client Configuration
 *
 * Backend URL and anon key for connecting to InsForge PostgREST API
 * These values must be set in environment variables to enable scheduled posts.
 *
 * Required env vars:
 * - VITE_INSFORGE_BASE_URL - Your InsForge backend URL
 * - VITE_INSFORGE_ANON_KEY - Anonymous key for public access
 */

import { createClient } from '@insforge/sdk';

const INSFORGE_BASE_URL = import.meta.env.VITE_INSFORGE_BASE_URL || '';
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || '';

/**
 * Check if InsForge is properly configured
 * @returns true if both base URL and anon key are set
 */
export function isInsForgeConfigured(): boolean {
  return !!(INSFORGE_BASE_URL && INSFORGE_ANON_KEY);
}

/**
 * Get the InsForge base URL (empty string if not configured)
 */
export function getInsForgeBaseUrl(): string {
  return INSFORGE_BASE_URL;
}

const client = createClient({
  baseUrl: INSFORGE_BASE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

// Only export if configured to prevent errors
export const insforge = client;

// Named export for convenience
export const db = INSFORGE_BASE_URL ? client.database : null;

export default client;
