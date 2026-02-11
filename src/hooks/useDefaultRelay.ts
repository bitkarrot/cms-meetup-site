import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';
import { getDefaultRelayUrl } from '@/lib/relay';

export function useDefaultRelay() {
  const { config } = useAppContext();
  const { nostr: poolNostr } = useNostr();
  
  // Environment variable relay ALWAYS has highest priority, then site config, then first relay
  const envRelay = getDefaultRelayUrl();
  const defaultRelayUrl = envRelay ||
    config.siteConfig?.defaultRelay ||
    config.relayMetadata?.relays?.[0]?.url;
  
  // Create a dedicated connection to the default relay only
  // Wrap in try-catch so the app doesn't crash if the relay is offline
  const defaultRelay = useMemo(() => {
    if (!defaultRelayUrl) return null;
    try {
      return poolNostr.relay(defaultRelayUrl);
    } catch (err) {
      console.warn(`[useDefaultRelay] Failed to connect to relay ${defaultRelayUrl}:`, err);
      return null;
    }
  }, [poolNostr, defaultRelayUrl]);
  
  // Get publishing relays
  const publishRelays = config.siteConfig?.publishRelays || 
    config.relayMetadata?.relays?.filter(r => r.write).map(r => r.url) || [];
  
  return {
    defaultRelay,
    defaultRelayUrl,
    publishRelays,
    nostr: defaultRelay, // Use the dedicated relay for reading
    poolNostr, // Expose the pool for publishing if needed
  };
}