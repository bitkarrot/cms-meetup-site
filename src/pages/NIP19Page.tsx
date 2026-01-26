import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const { config } = useAppContext();

  useEffect(() => {
    if (identifier) {
      const gateway = config.siteConfig?.nip19Gateway || 'https://nostr.at';
      const cleanGateway = gateway.endsWith('/') ? gateway.slice(0, -1) : gateway;
      window.location.href = `${cleanGateway}/${identifier}`;
    }
  }, [identifier, config.siteConfig?.nip19Gateway]);

  if (!identifier) {
    return <NotFound />;
  }

  try {
    nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Redirecting to Nostr gateway...</p>
    </div>
  );
} 