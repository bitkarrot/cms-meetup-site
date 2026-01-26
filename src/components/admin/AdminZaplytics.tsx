import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { useAuthor } from '@/hooks/useAuthor';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useZapAnalytics } from '@/hooks/useZapAnalytics';
import { TimeRangeButtons } from '@/components/zaplytics/TimeRangeSelector';
import { StatsCards } from '@/components/zaplytics/StatsCards';
import { EarningsChart } from '@/components/zaplytics/EarningsChart';
import { TopContentTable } from '@/components/zaplytics/TopContentTable';
import { TemporalPatternsChart } from '@/components/zaplytics/TemporalPatternsChart';
import { ZapperLoyalty } from '@/components/zaplytics/ZapperLoyalty';
import { ContentPerformance } from '@/components/zaplytics/ContentPerformance';
import { HashtagAnalytics } from '@/components/zaplytics/HashtagAnalytics';
import { ZapLoadingProgress } from '@/components/zaplytics/ZapLoadingProgress';
import type { TimeRange, CustomDateRange } from '@/types/zaplytics';

function UserOption({ pubkey }: { pubkey: string }) {
  const { data } = useAuthor(pubkey);
  const metadata = data?.metadata;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={metadata?.picture} alt={metadata?.name || pubkey} />
        <AvatarFallback>
          <Users className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[200px]">
        {metadata?.name || metadata?.display_name || pubkey.substring(0, 8)}
      </span>
    </div>
  );
}

export default function AdminZaplytics() {
  const { config } = useAppContext();
  const feedNpubs = config.siteConfig?.feedNpubs || [];
  
  const [selectedPubkey, setSelectedPubkey] = useState<string>(feedNpubs[0] || '');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();

  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useZapAnalytics(timeRange, customRange, selectedPubkey);

  const isCustomRangeIncomplete = timeRange === 'custom' && (!customRange?.from || !customRange?.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Zaplytics</h2>
          <p className="text-muted-foreground">
            Analyze zap earnings for your community members.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-64">
            <Select value={selectedPubkey} onValueChange={setSelectedPubkey}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {feedNpubs.map((npub) => (
                  <SelectItem key={npub} value={npub}>
                    <UserOption pubkey={npub} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <TimeRangeButtons 
            value={timeRange} 
            onChange={setTimeRange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>
      </div>

      {!selectedPubkey ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Please select a user from the dropdown to view their zap analytics.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {analytics?.loadingState && !isCustomRangeIncomplete && (
            <ZapLoadingProgress
              isLoading={analytics.loadingState.isLoading}
              isComplete={analytics.loadingState.isComplete}
              currentCount={analytics.loadingState.totalFetched}
              relayLimit={analytics.loadingState.relayLimit}
              canLoadMore={analytics.loadingState.canLoadMore}
              onLoadMore={analytics.loadingState.loadMoreZaps}
              autoLoadEnabled={analytics.loadingState.autoLoadEnabled}
              consecutiveFailures={analytics.loadingState.consecutiveFailures}
              onToggleAutoLoad={analytics.loadingState.toggleAutoLoad}
              onRestartAutoLoad={analytics.loadingState.restartAutoLoad}
              phase="receipts"
            />
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-6 text-destructive">
                Error loading analytics: {error instanceof Error ? error.message : 'Unknown error'}
              </CardContent>
            </Card>
          )}

          {!isCustomRangeIncomplete && (
            <div className="space-y-8">
              <StatsCards data={analytics} isLoading={isLoading} />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <EarningsChart 
                  data={analytics?.earningsByPeriod || []} 
                  timeRange={timeRange}
                  customRange={customRange}
                  isLoading={isLoading} 
                />
                <TopContentTable 
                  data={analytics?.topContent || []}
                  isLoading={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {analytics?.temporalPatterns && (
                  <TemporalPatternsChart 
                    hourlyData={analytics.temporalPatterns.earningsByHour}
                    weeklyData={analytics.temporalPatterns.earningsByDayOfWeek}
                    isLoading={isLoading}
                  />
                )}
                {analytics?.zapperLoyalty && (
                  <ZapperLoyalty 
                    data={analytics.zapperLoyalty}
                    isLoading={isLoading}
                  />
                )}
              </div>

              {analytics?.contentPerformance && analytics.contentPerformance.length > 0 && (
                <ContentPerformance 
                  data={analytics.contentPerformance}
                  isLoading={isLoading}
                />
              )}

              {analytics?.hashtagPerformance && (
                <HashtagAnalytics 
                  data={analytics.hashtagPerformance}
                  isLoading={isLoading}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
