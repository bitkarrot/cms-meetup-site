import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResponsiveContainer, 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import type { EarningsByHour, EarningsByDayOfWeek } from '@/types/zaplytics';
import { formatSats } from '@/lib/zaplytics/utils';

interface TemporalPatternsChartProps {
  hourlyData: EarningsByHour[];
  weeklyData: EarningsByDayOfWeek[];
  isLoading: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      totalSats: number;
      zapCount: number;
      avgZapAmount: number;
    };
  }>;
  label?: string | number;
}

// Purple to blue gradient colors (darker for higher values)
const generateHeatmapColor = (value: number, maxValue: number): string => {
  if (maxValue === 0) return 'hsl(263, 20%, 50%)';
  
  const intensity = Math.min(value / maxValue, 1);
  const hue = 263 - (intensity * 20); // From purple (263) to blue (243)
  const saturation = 20 + (intensity * 67); // From 20% to 87%
  const lightness = 80 - (intensity * 35); // From 80% to 45%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function TemporalPatternsChart({ hourlyData, weeklyData, isLoading }: TemporalPatternsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if ((!hourlyData || hourlyData.length === 0) && (!weeklyData || weeklyData.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Patterns</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No temporal pattern data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate max values for color scaling
  const maxHourlyEarnings = Math.max(...hourlyData.map(d => d.totalSats));
  const maxWeeklyEarnings = Math.max(...weeklyData.map(d => d.totalSats));

  // Add colors to data
  const coloredHourlyData = hourlyData.map(item => ({
    ...item,
    color: generateHeatmapColor(item.totalSats, maxHourlyEarnings),
    hourLabel: `${item.hour.toString().padStart(2, '0')}:00`,
  }));

  const coloredWeeklyData = weeklyData.map(item => ({
    ...item,
    color: generateHeatmapColor(item.totalSats, maxWeeklyEarnings),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-1 space-y-1">
          <p className="text-sm text-primary">
            <span className="font-medium">{formatSats(data.totalSats)}</span> sats
          </p>
          <p className="text-sm text-muted-foreground">
            {data.zapCount} zap{data.zapCount !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            Avg: {formatSats(data.avgZapAmount)} sats/zap
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Patterns</CardTitle>
        <p className="text-sm text-muted-foreground">
          When you earn the most zaps - optimize your posting schedule
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hourly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hourly">By Hour of Day</TabsTrigger>
            <TabsTrigger value="weekly">By Day of Week</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hourly" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Earnings by Hour (24h)</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Best time to post: {
                  coloredHourlyData.length > 0 
                    ? coloredHourlyData.reduce((best, current) => 
                        current.totalSats > best.totalSats ? current : best
                      ).hourLabel
                    : 'No data'
                }
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={coloredHourlyData} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hourLabel" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    interval={1}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => formatSats(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="totalSats" 
                    radius={[2, 2, 0, 0]}
                  >
                    {coloredHourlyData.map((entry, index) => (
                      <Cell key={`hourly-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="weekly" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Earnings by Day of Week</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Best day to post: {
                  coloredWeeklyData.length > 0 
                    ? coloredWeeklyData.reduce((best, current) => 
                        current.totalSats > best.totalSats ? current : best
                      ).dayName
                    : 'No data'
                }
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={coloredWeeklyData} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dayName" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => formatSats(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="totalSats" 
                    radius={[4, 4, 0, 0]}
                  >
                    {coloredWeeklyData.map((entry, index) => (
                      <Cell key={`weekly-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}