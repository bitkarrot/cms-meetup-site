import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useZapAnalytics } from '@/hooks/useZapAnalytics';
import { LoginArea } from '@/components/auth/LoginArea';
import { TimeRangeButtons } from '@/components/zaplytics/TimeRangeSelector';
import { StatsCards } from '@/components/zaplytics/StatsCards';
import { EarningsChart } from '@/components/zaplytics/EarningsChart';
import { TopContentTable } from '@/components/zaplytics/TopContentTable';
import { EarningsByKindChart } from '@/components/zaplytics/EarningsByKindChart';
import { TemporalPatternsChart } from '@/components/zaplytics/TemporalPatternsChart';
import { ZapperLoyalty } from '@/components/zaplytics/ZapperLoyalty';
import { ContentPerformance } from '@/components/zaplytics/ContentPerformance';
import { HashtagAnalytics } from '@/components/zaplytics/HashtagAnalytics';
import { CsvExport } from '@/components/zaplytics/CsvExport';
import { ZapLoadingProgress } from '@/components/zaplytics/ZapLoadingProgress';
import type { TimeRange, CustomDateRange, AnalyticsData } from '@/types/zaplytics';

export function ZaplyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  
  const { user } = useCurrentUser();
  
  // Check if custom range is selected but incomplete
  const isCustomRangeIncomplete = timeRange === 'custom' && (!customRange?.from || !customRange?.to);
  
  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useZapAnalytics(timeRange, customRange) as {
    data?: AnalyticsData & { 
      loadingState: {
        isLoading: boolean; 
        isComplete: boolean; 
        totalFetched: number; 
        relayLimit: number | null;
        canLoadMore: boolean;
        loadMoreZaps: () => void;
        autoLoadEnabled: boolean;
        consecutiveFailures: number;
        toggleAutoLoad: () => void;
        restartAutoLoad: () => void;
      }
    };
    isLoading: boolean;
    error: Error | null;
  };

  // User not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Zaplytics</h1>
                  <p className="text-sm text-muted-foreground">
                    Track your Nostr zap earnings
                  </p>
                </div>
              </div>
              <LoginArea className="max-w-48" />
            </div>
          </div>
        </div>

        {/* Login prompt */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-6 bg-primary/5 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Zap className="h-12 w-12 text-primary" />
            </div>
            
            <h2 className="text-3xl font-bold mb-4">
              Welcome to Zaplytics
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Your personal analytics dashboard for tracking zap earnings on Nostr.
              See which content performs best, who your top supporters are, and 
              how your earnings trend over time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center p-6">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Track Earnings</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your zap earnings over time with detailed charts
                </p>
              </Card>
              
              <Card className="text-center p-6">
                <BarChart3 className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Content Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  See which content earns the most and what types perform best
                </p>
              </Card>

              <Card className="text-center p-6">
                <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Zapper Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Discover who your biggest supporters are and thank them
                </p>
              </Card>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Ready to get started?</h3>
              <LoginArea className="w-full max-w-sm mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User logged in - show dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Zaplytics</h1>
                <p className="text-sm text-muted-foreground">
                  Your zap earnings dashboard
                </p>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <TimeRangeButtons 
                value={timeRange} 
                onChange={setTimeRange}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                className="lg:justify-end"
              />
              <LoginArea className="max-w-48" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {/* Error state */}
        {error && (
          <Alert className="mb-6 border-destructive">
            <AlertDescription>
              Failed to load zap data: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Custom range incomplete state */}
        {isCustomRangeIncomplete && (
          <Alert className="mb-6">
            <AlertDescription>
              Please select both start and end dates to view your custom range analytics.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading Progress */}
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

        {!isCustomRangeIncomplete && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <StatsCards data={analytics} isLoading={isLoading} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Earnings Over Time */}
              <EarningsChart 
                data={analytics?.earningsByPeriod || []} 
                timeRange={timeRange}
                customRange={customRange}
                isLoading={isLoading} 
              />

              {/* Top Content */}
              <TopContentTable 
                data={analytics?.topContent || []}
                isLoading={isLoading}
              />
            </div>

            {/* New Analytics Row 1: Temporal Patterns & Content Types */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Temporal Activity Patterns */}
              {analytics?.temporalPatterns && (
                <TemporalPatternsChart 
                  hourlyData={analytics.temporalPatterns.earningsByHour}
                  weeklyData={analytics.temporalPatterns.earningsByDayOfWeek}
                  isLoading={isLoading}
                />
              )}

              {/* Content Type Distribution (keep the single pie chart) */}
              {analytics?.earningsByKind && analytics.earningsByKind.length > 0 && (
                <EarningsByKindChart 
                  data={analytics.earningsByKind}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* New Analytics Row 2: Zapper Loyalty */}
            {analytics?.zapperLoyalty && (
              <ZapperLoyalty 
                data={analytics.zapperLoyalty}
                isLoading={isLoading}
              />
            )}

            {/* Content Performance Analysis - Full Width */}
            {analytics?.contentPerformance && analytics.contentPerformance.length > 0 && (
              <ContentPerformance 
                data={analytics.contentPerformance}
                isLoading={isLoading}
              />
            )}

            {/* Hashtag Performance - Full Width */}
            {analytics?.hashtagPerformance && (
              <HashtagAnalytics 
                data={analytics.hashtagPerformance}
                isLoading={isLoading}
              />
            )}

            {/* CSV Export */}
            <CsvExport 
              data={analytics}
              timeRange={timeRange}
              customRange={customRange}
              isLoading={isLoading}
            />

            {/* Empty state when no data */}
            {!isLoading && analytics && analytics.totalZaps === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-16 px-8 text-center">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="p-6 bg-muted/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Zap className="h-12 w-12 text-muted-foreground" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">No zaps found</h3>
                      <p className="text-muted-foreground">
                        You haven't received any zaps in the selected time period. 
                        Create some content and share it to start earning zaps!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tips for earning zaps:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Share valuable insights and knowledge</li>
                        <li>• Create engaging content regularly</li>
                        <li>• Interact with the Nostr community</li>
                        <li>• Use relevant hashtags</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}