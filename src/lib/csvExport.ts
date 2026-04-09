import type { AnalyticsData } from '@/types/zaplytics';
import { createNjumpEventLink, createNjumpProfileLink } from '@/lib/zaplytics/utils';

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportZapsCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = ['Date', 'Amount (sats)', 'Zapper Pubkey', 'Comment', 'Event ID', 'Event Kind'];
  const rows = data.allZaps.map((zap) => [
    new Date(zap.receipt.created_at * 1000).toISOString(),
    String(zap.amount),
    zap.zapper.pubkey,
    zap.comment ?? '',
    zap.zappedEvent?.id ?? '',
    String(zap.zappedEvent?.kind ?? ''),
  ]);
  downloadCsv(`zaps-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportEarningsByPeriodCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = ['Period', 'Total Sats', 'Zap Count'];
  const rows = data.earningsByPeriod.map((e) => [
    e.period,
    String(e.totalSats),
    String(e.zapCount),
  ]);
  downloadCsv(`earnings-by-period-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportTopContentCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = ['Event ID', 'Event Kind', 'Author', 'Content Preview', 'Total Sats', 'Zap Count', 'Link'];
  const rows = data.topContent.map((c) => [
    c.eventId,
    String(c.eventKind),
    c.author,
    c.content.slice(0, 100),
    String(c.totalSats),
    String(c.zapCount),
    createNjumpEventLink(c.eventId),
  ]);
  downloadCsv(`top-content-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportZapperLoyaltyCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = [
    'Pubkey', 'Name', 'Category', 'Total Sats', 'Zap Count',
    'First Zap', 'Last Zap', 'Days Active', 'Avg Days Between Zaps', 'Is Regular', 'Profile Link',
  ];
  const rows = data.zapperLoyalty.topLoyalZappers.map((z) => [
    z.pubkey,
    z.name ?? '',
    z.category,
    String(z.totalSats),
    String(z.zapCount),
    z.firstZapDate.toISOString(),
    z.lastZapDate.toISOString(),
    String(z.daysBetweenFirstAndLast),
    String(Math.round(z.averageDaysBetweenZaps)),
    z.isRegular ? 'Yes' : 'No',
    createNjumpProfileLink(z.pubkey),
  ]);
  downloadCsv(`supporter-loyalty-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportContentPerformanceCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = [
    'Event ID', 'Kind', 'Author', 'Content Preview', 'Total Sats', 'Zap Count',
    'Avg Zap (sats)', 'Time to First Zap (s)', 'Peak Window (h)', 'Longevity (days)', 'Virality Score', 'Link',
  ];
  const rows = data.contentPerformance.map((c) => [
    c.eventId,
    String(c.eventKind),
    c.author,
    c.content.slice(0, 100),
    String(c.totalSats),
    String(c.zapCount),
    String(c.avgZapAmount),
    String(Math.round(c.timeToFirstZap)),
    String(c.peakEarningsWindow),
    String(Math.round(c.longevityDays)),
    c.viralityScore.toFixed(1),
    createNjumpEventLink(c.eventId),
  ]);
  downloadCsv(`content-performance-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportHashtagPerformanceCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const headers = ['Hashtag', 'Total Sats', 'Zap Count', 'Avg Zap (sats)', 'Post Count', 'Avg Time to First Zap (s)'];
  const rows = data.hashtagPerformance.map((h) => [
    h.hashtag,
    String(h.totalSats),
    String(h.zapCount),
    String(h.avgZapAmount),
    String(h.postCount),
    String(Math.round(h.avgTimeToFirstZap)),
  ]);
  downloadCsv(`hashtag-performance-${timeRangeLabel}.csv`, [headers, ...rows]);
}

export function exportTemporalPatternsCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const hourHeaders = ['Hour (0-23)', 'Total Sats', 'Zap Count', 'Avg Zap (sats)'];
  const hourRows = data.temporalPatterns.earningsByHour.map((h) => [
    String(h.hour),
    String(h.totalSats),
    String(h.zapCount),
    String(h.avgZapAmount),
  ]);
  downloadCsv(`temporal-by-hour-${timeRangeLabel}.csv`, [hourHeaders, ...hourRows]);

  const dayHeaders = ['Day of Week', 'Day Name', 'Total Sats', 'Zap Count', 'Avg Zap (sats)'];
  const dayRows = data.temporalPatterns.earningsByDayOfWeek.map((d) => [
    String(d.dayOfWeek),
    d.dayName,
    String(d.totalSats),
    String(d.zapCount),
    String(d.avgZapAmount),
  ]);
  downloadCsv(`temporal-by-day-${timeRangeLabel}.csv`, [dayHeaders, ...dayRows]);
}

export function exportSummaryCsv(data: AnalyticsData, timeRangeLabel: string): void {
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Period', timeRangeLabel],
    ['Total Earnings (sats)', String(data.totalEarnings)],
    ['Total Zaps', String(data.totalZaps)],
    ['Unique Zappers', String(data.uniqueZappers)],
    ['Top Content Count', String(data.topContent.length)],
    ['New Zappers', String(data.zapperLoyalty.newZappers)],
    ['Returning Zappers', String(data.zapperLoyalty.returningZappers)],
    ['Regular Supporters', String(data.zapperLoyalty.regularSupporters)],
    ['Avg Lifetime Value (sats)', String(data.zapperLoyalty.averageLifetimeValue)],
  ];
  downloadCsv(`analytics-summary-${timeRangeLabel}.csv`, rows);
}
