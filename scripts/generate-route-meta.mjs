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
const LEGACY_SITE_CONFIG_DTAG = 'nostr-meetup-site-config';

function getScopedSiteConfigDTag(relay) {
  return `nostr-meetup-site-config:${relay.replace(/\/$/, '')}`;
}

function pickLatestEvent(events) {
  return [...events].sort((a, b) => b.created_at - a.created_at)[0] || null;
}

async function fetchSiteConfigFromRelay() {
  if (!relayUrl || !masterPubkey) {
    console.log('[seo] skipping relay site-config fetch (missing VITE_DEFAULT_RELAY or VITE_MASTER_PUBKEY)');
    return null;
  }

  const pool = new SimplePool({ enableReconnect: false });

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

    const title = configEvent.tags.find(([name]) => name === 'title')?.[1] || '';
    const heroSubtitle = configEvent.tags.find(([name]) => name === 'hero_subtitle')?.[1] || '';
    const ogImage = configEvent.tags.find(([name]) => name === 'og_image')?.[1] || '';

    return {
      title,
      heroSubtitle,
      ogImage,
    };
  } catch (error) {
    console.warn('[seo] failed to fetch kind 30078 site-config, using defaults:', error);
    return null;
  } finally {
    pool.close([relayUrl]);
    pool.destroy();
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRoutes(siteConfig) {
  const siteTitle = siteConfig?.title || DEFAULT_SITE_TITLE;
  const homeDescription = siteConfig?.heroSubtitle || DEFAULT_HOME_DESCRIPTION;

  return [
    {
      path: '/',
      title: siteTitle,
      description: homeDescription,
      previewImage: envOgImage || siteConfig?.ogImage || '',
    },
    {
      path: '/blog',
      title: `Blog - ${siteTitle}`,
      description: DEFAULT_BLOG_DESCRIPTION,
      previewImage: envOgImage || siteConfig?.ogImage || '',
    },
    {
      path: '/events',
      title: `Events - ${siteTitle}`,
      description: DEFAULT_EVENTS_DESCRIPTION,
      previewImage: envOgImage || siteConfig?.ogImage || '',
    },
  ];
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
  const siteConfig = await fetchSiteConfigFromRelay();
  const routes = buildRoutes(siteConfig);

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
