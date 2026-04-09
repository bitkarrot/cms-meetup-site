import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from "recharts";
import type { EarningsByKind } from "@/types/zaplytics";
import { formatSats, formatPercentage } from "@/lib/zaplytics/utils";

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

const COLORS = [
  "color-mix(in srgb, var(--primary), transparent 0%)",
  "color-mix(in srgb, var(--primary), transparent 15%)",
  "color-mix(in srgb, var(--primary), transparent 30%)",
  "color-mix(in srgb, var(--primary), transparent 45%)",
  "color-mix(in srgb, var(--primary), transparent 60%)",
  "color-mix(in srgb, var(--primary), transparent 70%)",
  "color-mix(in srgb, var(--primary), transparent 80%)",
  "color-mix(in srgb, var(--primary), transparent 90%)",
];

export function EarningsByKindChart({ data, isLoading }: EarningsByKindChartProps) {
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{d.kindName}</p>
        <p className="text-primary mt-1">
          <span className="font-medium">{formatSats(d.totalSats)}</span> sats
        </p>
        <p className="text-muted-foreground">{d.zapCount} zap{d.zapCount !== 1 ? 's' : ''}</p>
        <p className="text-muted-foreground">{formatPercentage(d.percentage)}</p>
      </div>
    );
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Content Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No data for this time period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings by Content Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="totalSats"
                nameKey="kindName"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ kindName, percentage }) =>
                  `${kindName} (${formatPercentage(percentage)})`
                }
                labelLine={false}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((entry, index) => (
            <div key={entry.kind} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span className="text-muted-foreground">{entry.kindName}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-medium">{formatSats(entry.totalSats)} sats</span>
                <span className="text-muted-foreground w-12">{formatPercentage(entry.percentage)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
