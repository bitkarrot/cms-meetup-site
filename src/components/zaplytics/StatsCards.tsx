import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Users, TrendingUp, Activity } from 'lucide-react';
import type { AnalyticsData } from '@/types/zaplytics';
import { formatSats } from '@/lib/zaplytics/utils';

interface StatsCardsProps {
  data?: AnalyticsData;
  isLoading: boolean;
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Earnings", value: "0", subtitle: "sats earned", icon: Zap },
          { title: "Total Zaps", value: "0", subtitle: "zaps received", icon: Activity },
          { title: "Unique Zappers", value: "0", subtitle: "different users", icon: Users },
          { title: "Average per Zap", value: "0", subtitle: "sats per zap", icon: TrendingUp },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const uniqueZappers = data.uniqueZappers;
  const averagePerZap = data.totalZaps > 0 ? Math.round(data.totalEarnings / data.totalZaps) : 0;

  const stats = [
    {
      title: "Total Earnings",
      value: formatSats(data.totalEarnings),
      subtitle: "sats earned",
      icon: Zap,
    },
    {
      title: "Total Zaps",
      value: formatSats(data.totalZaps),
      subtitle: "zaps received",
      icon: Activity,
    },
    {
      title: "Unique Zappers",
      value: formatSats(uniqueZappers),
      subtitle: "different users",
      icon: Users,
    },
    {
      title: "Average per Zap",
      value: formatSats(averagePerZap),
      subtitle: "sats per zap",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <Card key={i} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}