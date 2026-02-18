import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SimplePool } from 'nostr-tools/pool';

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

const SEO_META_START = '<!-- SEO_META_START -->';
const SEO_META_END = '<!-- SEO_META_END -->';

const siteUrl = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');
const envOgImage = process.env.VITE_OG_IMAGE || '';
const relayUrl = (process.env.VITE_DEFAULT_RELAY || '').replace(/\/$/, '');
const masterPubkey = (process.env.VITE_MASTER_PUBKEY || '').trim().toLowerCase();

const DEFAULT_SITE_TITLE = 'Community Meetup Site';
const DEFAULT_HOME_DESCRIPTION = 'Join us for amazing meetups and events';
const DEFAULT_BLOG_DESCRIPTION = 'Read our latest blog posts and community updates.';
const DEFAULT_EVENTS_DESCRIPTION = 'Browse upcoming and past community events and meetups.';
const DEFAULT_EVENT_DESCRIPTION = 'Event details and RSVP information';
const LEGACY_SITE_CONFIG_DTAG = 'nostr-meetup-site-config';

function getScopedSiteConfigDTag(relay) {
  return `nostr-meetup-site-config:${relay.replace(/\/$/, '')}`;
}

function pickLatestEvent(events) {
  return [...events].sort((a, b) => b.created_at - a.created_at)[0] || null;
}

function getTagValue(tags, name) {
  return tags.find(([tagName]) => tagName === name)?.[1] || '';
}

function parseAdminRoles(adminRolesTag) {
  if (!adminRolesTag) return {};

  try {
    const parsed = JSON.parse(adminRolesTag);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Ignore malformed data and continue with defaults.
  }

  return {};
}

function canUseAuthor(pubkey, adminRoles) {
  const author = (pubkey || '').toLowerCase().trim();
  if (!author) return false;
  if (masterPubkey && author === masterPubkey) return true;
  return adminRoles[author] === 'primary';
}

async function fetchSiteConfigFromRelay(pool) {
  if (!relayUrl || !masterPubkey) {
    console.log('[seo] skipping relay site-config fetch (missing VITE_DEFAULT_RELAY or VITE_MASTER_PUBKEY)');
    return null;
  }

  try {
    const scopedEvents = await pool.querySync(
      [relayUrl],
      {
        kinds: [30078],
        authors: [masterPubkey],
        '#d': [getScopedSiteConfigDTag(relayUrl)],
        limit: 5,
      },
      { maxWait: 5000 },
    );

    let configEvent = pickLatestEvent(scopedEvents);

    if (!configEvent) {
      const legacyEvents = await pool.querySync(
        [relayUrl],
        {
          kinds: [30078],
          authors: [masterPubkey],
          '#d': [LEGACY_SITE_CONFIG_DTAG],
          limit: 5,
        },
        { maxWait: 5000 },
      );
      configEvent = pickLatestEvent(legacyEvents);
    }

    if (!configEvent) {
      console.log('[seo] no kind 30078 site-config event found, using defaults');
      return null;
    }

    const tags = configEvent.tags || [];
    const title = getTagValue(tags, 'title');
    const heroSubtitle = getTagValue(tags, 'hero_subtitle');
    const ogImage = getTagValue(tags, 'og_image');
    const adminRoles = parseAdminRoles(getTagValue(tags, 'admin_roles'));

    return {
      title,
      heroSubtitle,
      ogImage,
      adminRoles,
    };
  } catch (error) {
    console.warn('[seo] failed to fetch kind 30078 site-config, using defaults:', error);
    return null;
  }
}

function truncateText(text, maxLength = 160) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function summarizeText(rawText, fallback) {
  if (!rawText) return fallback;

  const normalized = rawText
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return fallback;
  return truncateText(normalized, 160);
}

async function fetchContentForDynamicRoutes(pool, siteConfig) {
  if (!relayUrl || !masterPubkey) {
    return { blogPosts: [], events: [] };
  }

  const adminRoles = siteConfig?.adminRoles || {};

  const [postEvents, calendarEvents] = await Promise.all([
    pool.querySync(
      [relayUrl],
      { kinds: [30023], limit: 500 },
      { maxWait: 7000 },
    ),
    pool.querySync(
      [relayUrl],
      { kinds: [31922, 31923], limit: 500 },
      { maxWait: 7000 },
    ),
  ]);

  const blogPosts = postEvents
    .filter((event) => canUseAuthor(event.pubkey, adminRoles))
    .filter((event) => getTagValue(event.tags || [], 'published') !== 'false')
    .map((event) => {
      const tags = event.tags || [];
      return {
        id: event.id,
        title: getTagValue(tags, 'title') || 'Untitled',
        content: event.content || '',
        image: getTagValue(tags, 'image'),
        createdAt: event.created_at,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const events = calendarEvents
    .filter((event) => canUseAuthor(event.pubkey, adminRoles))
    .map((event) => {
      const tags = event.tags || [];
      return {
        id: event.id,
        title: getTagValue(tags, 'title') || 'Untitled Event',
        summary: getTagValue(tags, 'summary'),
        image: getTagValue(tags, 'image'),
        createdAt: event.created_at,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return { blogPosts, events };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRoutes(siteConfig, contentData) {
  const siteTitle = siteConfig?.title || DEFAULT_SITE_TITLE;
  const homeDescription = siteConfig?.heroSubtitle || DEFAULT_HOME_DESCRIPTION;
  const globalPreviewImage = envOgImage || siteConfig?.ogImage || '';
  const blogPreviewImage = envOgImage || contentData.blogPosts.find((post) => post.image)?.image || siteConfig?.ogImage || '';
  const eventsPreviewImage = envOgImage || contentData.events.find((event) => event.image)?.image || siteConfig?.ogImage || '';

  const routes = [
    {
      path: '/',
      title: siteTitle,
      description: homeDescription,
      previewImage: globalPreviewImage,
    },
    {
      path: '/blog',
      title: `Blog - ${siteTitle}`,
      description: DEFAULT_BLOG_DESCRIPTION,
      previewImage: blogPreviewImage,
    },
    {
      path: '/events',
      title: `Events - ${siteTitle}`,
      description: DEFAULT_EVENTS_DESCRIPTION,
      previewImage: eventsPreviewImage,
    },
  ];

  for (const post of contentData.blogPosts) {
    routes.push({
      path: `/blog/${post.id}`,
      title: `${post.title} - ${siteTitle}`,
      description: summarizeText(post.content, DEFAULT_BLOG_DESCRIPTION),
      previewImage: post.image || blogPreviewImage || globalPreviewImage,
    });
  }

  for (const event of contentData.events) {
    routes.push({
      path: `/event/${event.id}`,
      title: `${event.title} - ${siteTitle}`,
      description: summarizeText(event.summary, DEFAULT_EVENT_DESCRIPTION),
      previewImage: event.image || eventsPreviewImage || globalPreviewImage,
    });
  }

  return routes;
}

function toAbsoluteUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (!siteUrl) return value;
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${siteUrl}${normalizedPath}`;
}

function buildSeoMetaBlock(route) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const ogUrl = toAbsoluteUrl(route.path);
  const ogImage = toAbsoluteUrl(route.previewImage || '');

  const lines = [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    '    <meta property="og:type" content="website" />',
    '    <meta property="twitter:card" content="summary_large_image" />',
    `    <meta property="twitter:title" content="${title}" />`,
    `    <meta property="twitter:description" content="${description}" />`,
  ];

  if (ogUrl) {
    lines.push(`    <meta property="og:url" content="${escapeHtml(ogUrl)}" />`);
  }

  if (ogImage) {
    lines.push(`    <meta property="og:image" content="${escapeHtml(ogImage)}" />`);
    lines.push(`    <meta property="twitter:image" content="${escapeHtml(ogImage)}" />`);
  }

  return lines.join('\n');
}

function outputPathForRoute(routePath) {
  if (routePath === '/') {
    return path.join(distDir, 'index.html');
  }

  return path.join(distDir, routePath.replace(/^\//, ''), 'index.html');
}

async function generateRouteMetaHtml() {
  const sourceHtml = await readFile(indexPath, 'utf8');
  const pool = new SimplePool({ enableReconnect: false });

  let siteConfig = null;
  let contentData = { blogPosts: [], events: [] };

  try {
    siteConfig = await fetchSiteConfigFromRelay(pool);
    contentData = await fetchContentForDynamicRoutes(pool, siteConfig);
  } finally {
    if (relayUrl) {
      pool.close([relayUrl]);
    }
    pool.destroy();
  }

  const routes = buildRoutes(siteConfig, contentData);

  if (!sourceHtml.includes(SEO_META_START) || !sourceHtml.includes(SEO_META_END)) {
    throw new Error('SEO markers not found in index.html.');
  }

  const seoBlockRegex = /<!-- SEO_META_START -->[\s\S]*?<!-- SEO_META_END -->/;

  for (const route of routes) {
    const routeMetaBlock = `${SEO_META_START}\n${buildSeoMetaBlock(route)}\n    ${SEO_META_END}`;
    const routeHtml = sourceHtml.replace(seoBlockRegex, routeMetaBlock);
    const outputPath = outputPathForRoute(route.path);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, routeHtml, 'utf8');
    console.log(`[seo] generated ${path.relative(distDir, outputPath)}`);
  }
}

generateRouteMetaHtml().catch((error) => {
  console.error('[seo] failed to generate route metadata files:', error);
  process.exitCode = 1;
});
