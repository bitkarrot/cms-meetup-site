import { useQuery } from '@tanstack/react-query';

interface NostrJsonResponse {
  names: Record<string, string>;
  relays?: Record<string, string[]>;
  nip46?: Record<string, string[]>;
}

const DEFAULT_NOSTR_JSON_URL = import.meta.env.VITE_REMOTE_NOSTR_JSON_URL || '';

export function useRemoteNostrJson(url: string = DEFAULT_NOSTR_JSON_URL) {
  return useQuery({
    queryKey: ['remote-nostr-json', url],
    queryFn: async () => {
      if (!url) return null;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch nostr.json');
      }
      const data: NostrJsonResponse = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

const MASTER_PUBKEY = import.meta.env.VITE_MASTER_PUBKEY || '';

export function useAdminAuth(pubkey?: string) {
  const { data: nostrJson, isLoading } = useRemoteNostrJson();

  const isAdmin = pubkey && nostrJson?.names ?
    Object.values(nostrJson.names).some(pk => pk.toLowerCase().trim() === pubkey.toLowerCase().trim()) : false;

  const isMaster = pubkey && MASTER_PUBKEY && pubkey.toLowerCase().trim() === MASTER_PUBKEY.toLowerCase().trim();

  return {
    isAdmin,
    isMaster: !!isMaster,
    isLoading,
    allowedPubkeys: nostrJson?.names ? Object.values(nostrJson.names) : [],
  };
}