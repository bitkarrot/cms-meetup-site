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
