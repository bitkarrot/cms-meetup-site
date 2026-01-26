import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from 'recharts';
import type { EarningsByKind } from '@/types/zaplytics';
import { formatSats, formatPercentage } from '@/lib/zaplytics/utils';

interface EarningsByKindChartProps {
  data: EarningsByKind[];
  isLoading: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      totalSats: number;
      zapCount: number;
      kindName: string;
      percentage: number;
    };
  }>;
  label?: string;
}

// Purple color palette for the charts
const COLORS = [
  'hsl(263, 87%, 65%)',
  'hsl(263, 87%, 55%)',
  'hsl(263, 87%, 45%)',
  'hsl(263, 87%, 35%)',
  'hsl(263, 87%, 25%)',
  'hsl(270, 87%, 65%)',
  'hsl(270, 87%, 55%)',
  'hsl(280, 87%, 65%)',
];

export function EarningsByKindChart({ data, isLoading }: EarningsByKindChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Content Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Content Type</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No content type data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{data.kindName}</p>
        <div className="mt-1 space-y-1">
          <p className="text-sm text-primary">
            <span className="font-medium">{formatSats(data.totalSats)}</span> sats
          </p>
          <p className="text-sm text-muted-foreground">
            {formatPercentage(data.percentage)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.zapCount} zap{data.zapCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings by Content Type</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of earnings across different event kinds
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="totalSats"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Content Types</h4>
            <div className="space-y-2">
              {chartData.map((item) => (
                <div key={item.kind} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.kindName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatSats(item.totalSats)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercentage(item.percentage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}