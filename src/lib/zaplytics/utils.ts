import * as lightningPayReq from 'light-bolt11-decoder';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { 
  ZapReceipt, 
  ParsedZap, 
  EarningsByPeriod, 
  EarningsByContent, 
  EarningsByKind, 
  ZapperStats,
  TimeRange,
  CustomDateRange
} from '@/types/zaplytics';
import { TIME_RANGES, KIND_NAMES } from '@/types/zaplytics';

/**
 * Parse a Lightning invoice to extract the amount in sats
 */
export function parseBolt11Amount(bolt11: string): number {
  try {
    const decoded = (lightningPayReq as unknown as { decode: (bolt11: string) => { sections: { name: string; value: string | number }[] } }).decode(bolt11);
    const amountSection = decoded.sections.find((section) => section.name === 'amount');
    if (amountSection && amountSection.value) {
      // Convert from millisats to sats
      return Math.floor(Number(amountSection.value) / 1000);
    }
  } catch (error) {
    console.warn('Failed to decode bolt11:', error);
  }
  return 0;
}

/**
 * Parse a zap receipt event into a structured format
 */
export function parseZapReceipt(zapEvent: ZapReceipt): ParsedZap | null {
  try {
    // Extract bolt11 from tags
    const bolt11Tag = zapEvent.tags.find(tag => tag[0] === 'bolt11');
    if (!bolt11Tag || !bolt11Tag[1]) return null;

    const amount = parseBolt11Amount(bolt11Tag[1]);
    if (amount === 0) return null;

    // Extract zapped event info
    const eTag = zapEvent.tags.find(tag => tag[0] === 'e');
    const pTag = zapEvent.tags.find(tag => tag[0] === 'p');
    
    // Extract zap request if present
    const zapRequestDesc = zapEvent.tags.find(tag => tag[0] === 'description');
    let zapRequest: ParsedZap['zapRequest'] | undefined;
    let comment: string | undefined;

    if (zapRequestDesc && zapRequestDesc[1]) {
      try {
        const zapRequestEvent = JSON.parse(zapRequestDesc[1]);
        zapRequest = {
          pubkey: zapRequestEvent.pubkey,
          content: zapRequestEvent.content,
          created_at: zapRequestEvent.created_at,
        };
        comment = zapRequestEvent.content || undefined;
      } catch (error) {
        console.warn('Failed to parse zap request:', error);
      }
    }

    const parsedZap: ParsedZap = {
      receipt: zapEvent,
      amount,
      comment,
      zapRequest,
      zapper: {
        pubkey: zapRequest?.pubkey || zapEvent.pubkey,
      },
    };

    if (eTag && eTag[1]) {
      parsedZap.zappedEvent = {
        id: eTag[1],
        kind: 1, // Default to kind 1, will be updated when we fetch the actual event
        author: pTag?.[1] || '',
        content: '',
        created_at: 0,
      };
    }

    return parsedZap;
  } catch (error) {
    console.warn('Failed to parse zap receipt:', error);
    return null;
  }
}

/**
 * Validate if an event is a proper zap receipt
 */
export function isValidZapReceipt(event: NostrEvent): event is ZapReceipt {
  if (event.kind !== 9735) return false;
  
  // Must have bolt11 tag
  const bolt11Tag = event.tags.find(tag => tag[0] === 'bolt11');
  if (!bolt11Tag || !bolt11Tag[1]) return false;
  
  // Must have valid amount
  const amount = parseBolt11Amount(bolt11Tag[1]);
  return amount > 0;
}

/**
 * Get date range for a time period
 */
export function getDateRange(timeRange: TimeRange, customRange?: CustomDateRange): { since: number; until?: number } {
  if (timeRange === 'custom' && customRange) {
    // For custom range, use the provided dates
    const since = Math.floor(customRange.from.getTime() / 1000);
    const until = Math.floor(customRange.to.getTime() / 1000);
    return { since, until };
  }
  
  const config = TIME_RANGES[timeRange];
  const now = Math.floor(Date.now() / 1000);
  
  if (config.days === null) {
    // All time - no since filter
    return { since: 0 };
  }
  
  const since = now - (config.days * 24 * 60 * 60);
  return { since, until: now };
}

/**
 * Group zaps by time period
 */
export function groupZapsByPeriod(zaps: ParsedZap[], timeRange: TimeRange, customRange?: CustomDateRange): EarningsByPeriod[] {
  const config = TIME_RANGES[timeRange];
  const grouped = new Map<string, { totalSats: number; zapCount: number; date: Date }>();

  // For custom ranges, determine appropriate grouping based on range length
  let groupBy = config.groupBy;
  if (timeRange === 'custom' && customRange) {
    const daysDiff = Math.ceil((customRange.to.getTime() - customRange.from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 2) {
      groupBy = 'hour';
    } else if (daysDiff <= 31) {
      groupBy = 'day';
    } else if (daysDiff <= 90) {
      groupBy = 'week';
    } else {
      groupBy = 'month';
    }
  }

  zaps.forEach(zap => {
    const date = new Date(zap.receipt.created_at * 1000);
    let periodKey: string;
    let periodDate: Date;

    switch (groupBy) {
      case 'hour':
        periodKey = date.toISOString().slice(0, 13) + ':00:00.000Z'; // YYYY-MM-DDTHH
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        break;
      case 'day':
        periodKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        break;
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        periodKey = weekStart.toISOString().slice(0, 10);
        periodDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        break;
      }
      case 'month':
        periodKey = date.toISOString().slice(0, 7); // YYYY-MM
        periodDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      default:
        periodKey = date.toISOString().slice(0, 10);
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    const existing = grouped.get(periodKey) || { totalSats: 0, zapCount: 0, date: periodDate };
    existing.totalSats += zap.amount;
    existing.zapCount += 1;
    grouped.set(periodKey, existing);
  });

  return Array.from(grouped.entries())
    .map(([period, stats]) => ({
      period,
      ...stats,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Group zaps by content/event
 */
export function groupZapsByContent(zaps: ParsedZap[]): EarningsByContent[] {
  const grouped = new Map<string, EarningsByContent>();

  zaps.forEach(zap => {
    if (!zap.zappedEvent) return;

    const existing = grouped.get(zap.zappedEvent.id);
    if (existing) {
      existing.totalSats += zap.amount;
      existing.zapCount += 1;
    } else {
      grouped.set(zap.zappedEvent.id, {
        eventId: zap.zappedEvent.id,
        eventKind: zap.zappedEvent.kind,
        content: zap.zappedEvent.content || '',
        author: zap.zappedEvent.author,
        totalSats: zap.amount,
        zapCount: 1,
        created_at: zap.zappedEvent.created_at,
      });
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.totalSats - a.totalSats);
}

/**
 * Group zaps by event kind
 */
export function groupZapsByKind(zaps: ParsedZap[]): EarningsByKind[] {
  const grouped = new Map<number, { totalSats: number; zapCount: number }>();
  const totalSats = zaps.reduce((sum, zap) => sum + zap.amount, 0);

  zaps.forEach(zap => {
    if (!zap.zappedEvent) return;

    const kind = zap.zappedEvent.kind;
    const existing = grouped.get(kind) || { totalSats: 0, zapCount: 0 };
    existing.totalSats += zap.amount;
    existing.zapCount += 1;
    grouped.set(kind, existing);
  });

  return Array.from(grouped.entries())
    .map(([kind, stats]) => ({
      kind,
      kindName: KIND_NAMES[kind] || `Kind ${kind}`,
      totalSats: stats.totalSats,
      zapCount: stats.zapCount,
      percentage: totalSats > 0 ? (stats.totalSats / totalSats) * 100 : 0,
    }))
    .sort((a, b) => b.totalSats - a.totalSats);
}

/**
 * Get top zappers stats
 */
export function getTopZappers(zaps: ParsedZap[]): ZapperStats[] {
  const grouped = new Map<string, ZapperStats>();

  zaps.forEach(zap => {
    const existing = grouped.get(zap.zapper.pubkey);
    if (existing) {
      existing.totalSats += zap.amount;
      existing.zapCount += 1;
    } else {
      grouped.set(zap.zapper.pubkey, {
        pubkey: zap.zapper.pubkey,
        name: zap.zapper.name,
        nip05: zap.zapper.nip05,
        picture: zap.zapper.picture,
        totalSats: zap.amount,
        zapCount: 1,
      });
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.totalSats - a.totalSats);
}

/**
 * Format sats amount with proper thousands separators
 */
export function formatSats(sats: number): string {
  return sats.toLocaleString();
}

/**
 * Format percentage to 1 decimal place
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/**
 * Create njump links for events and profiles
 */
export function createNjumpEventLink(eventId: string): string {
  try {
    const nevent = nip19.noteEncode(eventId);
    return `https://njump.me/${nevent}`;
  } catch {
    return `https://njump.me/${eventId}`;
  }
}

export function createNjumpProfileLink(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `https://njump.me/${npub}`;
  } catch {
    return `https://njump.me/${pubkey}`;
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Analyze temporal patterns - earnings by hour of day
 */
export function groupZapsByHour(zaps: ParsedZap[]): import('@/types/zaplytics').EarningsByHour[] {
  const grouped = new Map<number, { totalSats: number; zapCount: number }>();

  // Initialize all 24 hours with zero values
  for (let hour = 0; hour < 24; hour++) {
    grouped.set(hour, { totalSats: 0, zapCount: 0 });
  }

  zaps.forEach(zap => {
    const date = new Date(zap.receipt.created_at * 1000);
    const hour = date.getHours();
    const existing = grouped.get(hour)!;
    existing.totalSats += zap.amount;
    existing.zapCount += 1;
  });

  return Array.from(grouped.entries())
    .map(([hour, stats]) => ({
      hour,
      totalSats: stats.totalSats,
      zapCount: stats.zapCount,
      avgZapAmount: stats.zapCount > 0 ? Math.round(stats.totalSats / stats.zapCount) : 0,
    }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Analyze temporal patterns - earnings by day of week
 */
export function groupZapsByDayOfWeek(zaps: ParsedZap[]): import('@/types/zaplytics').EarningsByDayOfWeek[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const grouped = new Map<number, { totalSats: number; zapCount: number }>();

  // Initialize all 7 days with zero values
  for (let day = 0; day < 7; day++) {
    grouped.set(day, { totalSats: 0, zapCount: 0 });
  }

  zaps.forEach(zap => {
    const date = new Date(zap.receipt.created_at * 1000);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const existing = grouped.get(dayOfWeek)!;
    existing.totalSats += zap.amount;
    existing.zapCount += 1;
  });

  return Array.from(grouped.entries())
    .map(([dayOfWeek, stats]) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      totalSats: stats.totalSats,
      zapCount: stats.zapCount,
      avgZapAmount: stats.zapCount > 0 ? Math.round(stats.totalSats / stats.zapCount) : 0,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Analyze zapper loyalty and retention patterns
 */
export function analyzeZapperLoyalty(zaps: ParsedZap[]): import('@/types/zaplytics').LoyaltyStats {
  const zapperData = new Map<string, {
    pubkey: string;
    name?: string;
    picture?: string;
    zaps: ParsedZap[];
    totalSats: number;
    zapCount: number;
  }>();

  // Group zaps by zapper
  zaps.forEach(zap => {
    const existing = zapperData.get(zap.zapper.pubkey);
    if (existing) {
      existing.zaps.push(zap);
      existing.totalSats += zap.amount;
      existing.zapCount += 1;
    } else {
      zapperData.set(zap.zapper.pubkey, {
        pubkey: zap.zapper.pubkey,
        name: zap.zapper.name,
        picture: zap.zapper.picture,
        zaps: [zap],
        totalSats: zap.amount,
        zapCount: 1,
      });
    }
  });

  const loyaltyAnalysis: import('@/types/zaplytics').ZapperLoyalty[] = [];
  let newZappers = 0;
  let returningZappers = 0;
  let regularSupporters = 0;

  zapperData.forEach(zapperInfo => {
    const sortedZaps = zapperInfo.zaps.sort((a, b) => a.receipt.created_at - b.receipt.created_at);
    const firstZapDate = new Date(sortedZaps[0].receipt.created_at * 1000);
    const lastZapDate = new Date(sortedZaps[sortedZaps.length - 1].receipt.created_at * 1000);
    
    const daysBetweenFirstAndLast = zapperInfo.zapCount > 1 
      ? Math.ceil((lastZapDate.getTime() - firstZapDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const averageDaysBetweenZaps = zapperInfo.zapCount > 1 
      ? daysBetweenFirstAndLast / (zapperInfo.zapCount - 1)
      : 0;

    // Categorize zappers based on behavior patterns
    let category: 'whale' | 'regular' | 'occasional' | 'one-time';
    let isRegular = false;

    if (zapperInfo.zapCount === 1) {
      category = 'one-time';
      newZappers++;
    } else {
      returningZappers++;
      
      if (zapperInfo.totalSats >= 10000) { // 10k+ sats = whale
        category = 'whale';
      } else if (zapperInfo.zapCount >= 5 || (zapperInfo.zapCount >= 3 && averageDaysBetweenZaps <= 7)) {
        category = 'regular';
        isRegular = true;
        regularSupporters++;
      } else {
        category = 'occasional';
      }
    }

    loyaltyAnalysis.push({
      pubkey: zapperInfo.pubkey,
      name: zapperInfo.name,
      picture: zapperInfo.picture,
      zapCount: zapperInfo.zapCount,
      totalSats: zapperInfo.totalSats,
      firstZapDate,
      lastZapDate,
      daysBetweenFirstAndLast,
      averageDaysBetweenZaps,
      isRegular,
      category,
    });
  });

  const totalZappers = zapperData.size;
  const totalSatsValue = Array.from(zapperData.values()).reduce((sum, zapper) => sum + zapper.totalSats, 0);
  const averageLifetimeValue = totalZappers > 0 ? Math.round(totalSatsValue / totalZappers) : 0;

  // Sort by total sats for top loyal zappers
  const topLoyalZappers = loyaltyAnalysis
    .filter(zapper => zapper.zapCount > 1) // Only returning zealers
    .sort((a, b) => b.totalSats - a.totalSats)
    .slice(0, 10);

  return {
    newZappers,
    returningZappers,
    regularSupporters,
    averageLifetimeValue,
    topLoyalZappers,
  };
}

/**
 * Analyze content performance metrics
 */
export function analyzeContentPerformance(zaps: ParsedZap[]): import('@/types/zaplytics').ContentPerformance[] {
  const contentData = new Map<string, {
    eventId: string;
    eventKind: number;
    content: string;
    author: string;
    created_at: number;
    zaps: ParsedZap[];
    totalSats: number;
    zapCount: number;
  }>();

  // Group zaps by content
  zaps.forEach(zap => {
    if (!zap.zappedEvent) return;
    
    const existing = contentData.get(zap.zappedEvent.id);
    if (existing) {
      existing.zaps.push(zap);
      existing.totalSats += zap.amount;
      existing.zapCount += 1;
    } else {
      contentData.set(zap.zappedEvent.id, {
        eventId: zap.zappedEvent.id,
        eventKind: zap.zappedEvent.kind,
        content: zap.zappedEvent.content || '',
        author: zap.zappedEvent.author,
        created_at: zap.zappedEvent.created_at,
        zaps: [zap],
        totalSats: zap.amount,
        zapCount: 1,
      });
    }
  });

  const performanceAnalysis: import('@/types/zaplytics').ContentPerformance[] = [];

  contentData.forEach(content => {
    const sortedZaps = content.zaps.sort((a, b) => a.receipt.created_at - b.receipt.created_at);
    const contentCreatedAt = content.created_at * 1000;
    const firstZapTime = sortedZaps[0].receipt.created_at * 1000;
    const lastZapTime = sortedZaps[sortedZaps.length - 1].receipt.created_at * 1000;

    // Time to first zap (seconds from content creation to first zap)
    const timeToFirstZap = Math.max(0, (firstZapTime - contentCreatedAt) / 1000);

    // Content longevity (days between first and last zap)
    const longevityDays = content.zapCount > 1 
      ? (lastZapTime - firstZapTime) / (1000 * 60 * 60 * 24)
      : 0;

    // Virality score - percentage of zaps received in first hour
    const firstHourCutoff = contentCreatedAt + (60 * 60 * 1000); // 1 hour after creation
    const firstHourZaps = sortedZaps.filter(zap => (zap.receipt.created_at * 1000) <= firstHourCutoff);
    const viralityScore = content.zapCount > 0 ? (firstHourZaps.length / content.zapCount) * 100 : 0;

    // Peak earnings window - find the best performing time window
    const windows = [1, 6, 24, 72]; // hours
    let bestWindow = 1;
    let maxWindowEarnings = 0;

    windows.forEach(windowHours => {
      const windowMs = windowHours * 60 * 60 * 1000;
      const windowCutoff = contentCreatedAt + windowMs;
      const windowZaps = sortedZaps.filter(zap => (zap.receipt.created_at * 1000) <= windowCutoff);
      const windowEarnings = windowZaps.reduce((sum, zap) => sum + zap.amount, 0);
      
      if (windowEarnings > maxWindowEarnings) {
        maxWindowEarnings = windowEarnings;
        bestWindow = windowHours;
      }
    });

    const avgZapAmount = Math.round(content.totalSats / content.zapCount);

    performanceAnalysis.push({
      eventId: content.eventId,
      eventKind: content.eventKind,
      content: content.content,
      author: content.author,
      created_at: content.created_at,
      totalSats: content.totalSats,
      zapCount: content.zapCount,
      timeToFirstZap,
      peakEarningsWindow: bestWindow,
      longevityDays,
      viralityScore,
      avgZapAmount,
    });
  });

  return performanceAnalysis.sort((a, b) => b.totalSats - a.totalSats);
}

/**
 * Extract hashtags from content text
 */
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

/**
 * Analyze hashtag performance
 */
export function analyzeHashtagPerformance(zaps: ParsedZap[]): import('@/types/zaplytics').HashtagPerformance[] {
  const hashtagData = new Map<string, {
    hashtag: string;
    totalSats: number;
    zapCount: number;
    posts: Set<string>;
    firstZapTimes: number[];
    contentCreatedTimes: number[];
  }>();

  const allPosts = new Map<string, { hashtags: string[], created_at: number, hasZaps: boolean }>();

  // First pass: collect all posts and their hashtags
  zaps.forEach(zap => {
    if (!zap.zappedEvent) return;
    
    const zappedEvent = zap.zappedEvent; // Store in variable for TypeScript
    const hashtags = extractHashtags(zappedEvent.content || '');
    
    if (!allPosts.has(zappedEvent.id)) {
      allPosts.set(zappedEvent.id, {
        hashtags,
        created_at: zappedEvent.created_at,
        hasZaps: true
      });
    }

    hashtags.forEach(hashtag => {
      const existing = hashtagData.get(hashtag);
      if (existing) {
        existing.totalSats += zap.amount;
        existing.zapCount += 1;
        existing.posts.add(zappedEvent.id);
        existing.firstZapTimes.push(zap.receipt.created_at);
        existing.contentCreatedTimes.push(zappedEvent.created_at);
      } else {
        hashtagData.set(hashtag, {
          hashtag,
          totalSats: zap.amount,
          zapCount: 1,
          posts: new Set([zappedEvent.id]),
          firstZapTimes: [zap.receipt.created_at],
          contentCreatedTimes: [zappedEvent.created_at],
        });
      }
    });
  });

  // Calculate success rates and other metrics
  const hashtagPerformance: import('@/types/zaplytics').HashtagPerformance[] = [];

  hashtagData.forEach((data) => {
    // Calculate average time to first zap
    const timeToFirstZaps = data.firstZapTimes.map((zapTime, index) => 
      Math.max(0, zapTime - data.contentCreatedTimes[index])
    );
    const avgTimeToFirstZap = timeToFirstZaps.length > 0 
      ? timeToFirstZaps.reduce((sum, time) => sum + time, 0) / timeToFirstZaps.length 
      : 0;

    const postCount = data.posts.size;
    
    // Success rate is 100% since we only have data for posts that got zapped
    // In a full implementation, we'd need to track all posts, not just zapped ones
    const successRate = 100; // This would be calculated differently with full post data
    
    const avgZapAmount = data.zapCount > 0 ? Math.round(data.totalSats / data.zapCount) : 0;

    hashtagPerformance.push({
      hashtag: data.hashtag,
      totalSats: data.totalSats,
      zapCount: data.zapCount,
      avgZapAmount,
      postCount,
      successRate,
      avgTimeToFirstZap,
    });
  });

  return hashtagPerformance
    .filter(h => h.zapCount >= 2) // Only include hashtags with at least 2 zaps
    .sort((a, b) => b.totalSats - a.totalSats);
}
