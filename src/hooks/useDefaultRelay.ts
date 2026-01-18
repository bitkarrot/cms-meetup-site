import { useNostr } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';

export function useDefaultRelay() {
  const { config } = useAppContext();
  const { nostr: poolNostr } = useNostr();
  
  // Get the default relay from site config or fall back to first relay
  const defaultRelayUrl = config.siteConfig?.defaultRelay || 
    config.relayMetadata?.relays?.[0]?.url || 
    'wss://swarm.hivetalk.org';
  
  // Create a dedicated connection to the default relay only
  const defaultRelay = poolNostr.relay(defaultRelayUrl);
  
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