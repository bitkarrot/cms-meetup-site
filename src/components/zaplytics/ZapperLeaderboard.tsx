import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Crown, Medal, Award, Zap } from 'lucide-react';
import type { ZapperStats } from '@/types/zaplytics';
import { formatSats, createNjumpProfileLink } from '@/lib/zaplytics/utils';
import { genUserName } from '@/lib/genUserName';

interface ZapperLeaderboardProps {
  data: ZapperStats[];
  isLoading: boolean;
}

export function ZapperLeaderboard({ data, isLoading }: ZapperLeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Zappers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
                <Skeleton className="h-6 w-[60px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Zappers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No zapper data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRankBadgeVariant = (index: number) => {
    switch (index) {
      case 0:
        return 'default'; // Gold
      case 1:
        return 'secondary'; // Silver
      case 2:
        return 'outline'; // Bronze
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Top Zappers
          <Badge variant="secondary">{data.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Users who have zapped you the most sats
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((zapper, index) => (
            <div 
              key={zapper.pubkey} 
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={zapper.picture} 
                  alt={zapper.name || genUserName(zapper.pubkey)}
                />
                <AvatarFallback>
                  {(zapper.name || genUserName(zapper.pubkey))
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium truncate">
                    {zapper.name || genUserName(zapper.pubkey)}
                  </h4>
                  
                  {index < 3 && (
                    <Badge variant={getRankBadgeVariant(index)} className="text-xs">
                      {index === 0 ? 'Top Zapper' : index === 1 ? '2nd Place' : '3rd Place'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {zapper.nip05 && (
                    <span className="truncate max-w-[120px]">
                      {zapper.nip05}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {zapper.zapCount} zap{zapper.zapCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Stats & Link */}
              <div className="flex-shrink-0 text-right">
                <div className="text-lg font-bold text-primary">
                  {formatSats(zapper.totalSats)}
                </div>
                <div className="text-xs text-muted-foreground">sats</div>
                
                <a
                  href={createNjumpProfileLink(zapper.pubkey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-opacity"
                >
                  View Profile <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No zappers yet</p>
            <p className="text-sm">Create some content to start earning zaps!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}