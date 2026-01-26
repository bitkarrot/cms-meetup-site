import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileSpreadsheet, 
  ChevronDown,
  Zap,
  TrendingUp,
  Users,
  Hash,
  Clock,
  BarChart3,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { AnalyticsData, TimeRange, CustomDateRange } from '@/types/zaplytics';
import {
  exportZapsCsv,
  exportEarningsByPeriodCsv,
  exportTopContentCsv,
  exportZapperLoyaltyCsv,
  exportContentPerformanceCsv,
  exportHashtagPerformanceCsv,
  exportTemporalPatternsCsv,
  exportSummaryCsv
} from '@/lib/csvExport';

interface CsvExportProps {
  data: AnalyticsData | undefined;
  timeRange: TimeRange;
  customRange?: CustomDateRange;
  isLoading: boolean;
}

interface ExportOption {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  recordCount: number;
  exportFn: () => void;
}

export function CsvExport({ data, timeRange, customRange, isLoading }: CsvExportProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  if (!data) return null;

  // Get time range label for filenames
  const getTimeRangeLabel = (): string => {
    if (timeRange === 'custom' && customRange?.from && customRange?.to) {
      const from = customRange.from.toISOString().split('T')[0];
      const to = customRange.to.toISOString().split('T')[0];
      return `custom-${from}-to-${to}`;
    }
    return timeRange;
  };

  const handleExport = async (exportFn: () => void, exportKey: string, label: string) => {
    try {
      setIsExporting(exportKey);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      exportFn();
      
      toast({
        title: "Export Complete",
        description: `${label} has been downloaded as CSV.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${label}. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      key: 'zaps',
      label: 'All Zaps',
      description: 'Individual zap records with details',
      icon: <Zap className="h-4 w-4" />,
      recordCount: data.allZaps.length,
      exportFn: () => exportZapsCsv(data, getTimeRangeLabel())
    },
    {
      key: 'earnings',
      label: 'Earnings by Period',
      description: 'Revenue grouped by time periods',
      icon: <TrendingUp className="h-4 w-4" />,
      recordCount: data.earningsByPeriod.length,
      exportFn: () => exportEarningsByPeriodCsv(data, getTimeRangeLabel())
    },
    {
      key: 'content',
      label: 'Top Content',
      description: 'Best performing content by earnings',
      icon: <FileText className="h-4 w-4" />,
      recordCount: data.topContent.length,
      exportFn: () => exportTopContentCsv(data, getTimeRangeLabel())
    },
    {
      key: 'loyalty',
      label: 'Supporter Loyalty',
      description: 'Zapper relationship and loyalty data',
      icon: <Users className="h-4 w-4" />,
      recordCount: data.zapperLoyalty.topLoyalZappers.length,
      exportFn: () => exportZapperLoyaltyCsv(data, getTimeRangeLabel())
    },
    {
      key: 'performance',
      label: 'Content Performance',
      description: 'Detailed content analytics and metrics',
      icon: <BarChart3 className="h-4 w-4" />,
      recordCount: data.contentPerformance.length,
      exportFn: () => exportContentPerformanceCsv(data, getTimeRangeLabel())
    },
    {
      key: 'hashtags',
      label: 'Hashtag Performance',
      description: 'How different hashtags perform',
      icon: <Hash className="h-4 w-4" />,
      recordCount: data.hashtagPerformance.length,
      exportFn: () => exportHashtagPerformanceCsv(data, getTimeRangeLabel())
    },
    {
      key: 'temporal',
      label: 'Time Patterns',
      description: 'Hourly and daily activity patterns (2 files)',
      icon: <Clock className="h-4 w-4" />,
      recordCount: data.temporalPatterns.earningsByHour.length + data.temporalPatterns.earningsByDayOfWeek.length,
      exportFn: () => exportTemporalPatternsCsv(data, getTimeRangeLabel())
    },
    {
      key: 'summary',
      label: 'Analytics Summary',
      description: 'Key metrics and totals overview',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      recordCount: 10, // Fixed number of summary metrics
      exportFn: () => exportSummaryCsv(data, getTimeRangeLabel())
    }
  ];

  // Filter out exports with no data
  const availableExports = exportOptions.filter(option => option.recordCount > 0);

  if (availableExports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No data available for export</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
          <Badge variant="secondary">{availableExports.length} datasets</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download your analytics data as CSV files for further analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Export Buttons for Most Common */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || isExporting === 'zaps'}
            onClick={() => handleExport(
              () => exportZapsCsv(data, getTimeRangeLabel()),
              'zaps',
              'All Zaps'
            )}
            className="flex items-center gap-2 h-auto py-3 px-4"
          >
            <Zap className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">All Zaps</div>
              <div className="text-xs text-muted-foreground">
                {data.allZaps.length} records
              </div>
            </div>
            {isExporting === 'zaps' && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
              </div>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || isExporting === 'summary'}
            onClick={() => handleExport(
              () => exportSummaryCsv(data, getTimeRangeLabel()),
              'summary',
              'Analytics Summary'
            )}
            className="flex items-center gap-2 h-auto py-3 px-4"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Summary</div>
              <div className="text-xs text-muted-foreground">
                Key metrics
              </div>
            </div>
            {isExporting === 'summary' && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
              </div>
            )}
          </Button>
        </div>

        {/* Dropdown for All Export Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full" disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              More Export Options
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="start">
            {availableExports.map((option, index) => (
              <div key={option.key}>
                <DropdownMenuItem
                  onClick={() => handleExport(option.exportFn, option.key, option.label)}
                  disabled={isExporting === option.key}
                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{option.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {option.recordCount} {option.recordCount === 1 ? 'record' : 'records'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {isExporting === option.key && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  )}
                </DropdownMenuItem>
                {index < availableExports.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Export Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• CSV files can be opened in Excel, Google Sheets, or other spreadsheet apps</li>
            <li>• Files include timestamps in ISO format for easy date filtering</li>
            <li>• Time patterns export includes both hourly and daily data as separate files</li>
            <li>• All amounts are in satoshis (sats)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}