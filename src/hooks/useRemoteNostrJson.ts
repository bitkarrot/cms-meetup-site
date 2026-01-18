import { useQuery } from '@tanstack/react-query';

interface NostrJsonResponse {
  names: Record<string, string>;
  relays?: Record<string, string[]>;
  nip46?: Record<string, string[]>;
}

export function useRemoteNostrJson(url: string = 'https://honey.hivetalk.org/.well-known/nostr.json') {
  return useQuery({
    queryKey: ['remote-nostr-json', url],
    queryFn: async () => {
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

export function useAdminAuth(pubkey?: string) {
  const { data: nostrJson, isLoading } = useRemoteNostrJson();
  
  const isAdmin = pubkey && nostrJson?.names ? 
    Object.values(nostrJson.names).includes(pubkey) : false;
  
  return {
    isAdmin,
    isLoading,
    allowedPubkeys: nostrJson?.names ? Object.values(nostrJson.names) : [],
  };
}