const { supabaseAdmin } = require('../services/supabase');

const SITEMAP_INDEX = 'https://handbook.flinders.edu.au/sitemap.xml';
const TOPIC_YEAR = 2026;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;

/**
 * Fetch and parse sitemap XML to extract topic URLs for the target year.
 */
async function getTopicUrls() {
  console.log('[topic-crawler] Fetching sitemap index...');
  const indexRes = await fetch(SITEMAP_INDEX);
  if (!indexRes.ok) throw new Error(`Sitemap index returned ${indexRes.status}`);
  const indexXml = await indexRes.text();

  // Extract child sitemap URLs
  const sitemapUrls = [...indexXml.matchAll(/<loc>(https:\/\/handbook\.flinders\.edu\.au\/sitemap\/[^<]+)<\/loc>/g)]
    .map((m) => m[1]);

  console.log(`[topic-crawler] Found ${sitemapUrls.length} sitemaps`);

  const topicUrls = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl);
      if (!res.ok) continue;
      const xml = await res.text();

      // Extract topic URLs matching our target year
      const pattern = new RegExp(`<loc>(https://handbook\\.flinders\\.edu\\.au/topics/${TOPIC_YEAR}/[^<]+)</loc>`, 'g');
      const matches = [...xml.matchAll(pattern)];
      for (const m of matches) {
        topicUrls.push(m[1]);
      }
    } catch (err) {
      console.log(`[topic-crawler] Failed to fetch sitemap: ${sitemapUrl}`, err.message);
    }
  }

  console.log(`[topic-crawler] Found ${topicUrls.length} topic URLs for ${TOPIC_YEAR}`);
  return topicUrls;
}

/**
 * Fetch a single topic page and extract data from the __NEXT_DATA__ script tag.
 */
async function fetchTopicData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!nextDataMatch) return null;

    const nextData = JSON.parse(nextDataMatch[1]);
    const pageContent = nextData?.props?.pageProps?.pageContent;
    if (!pageContent) return null;

    // Extract topic code from URL as fallback
    const urlCode = url.split('/').pop().toUpperCase();

    // Parse offerings for semesters, campuses, delivery modes
    const offerings = pageContent.offering || [];
    const semesters = [...new Set(offerings.map((o) => o.teaching_period?.value).filter(Boolean))];
    const campuses = [...new Set(offerings.map((o) => o.location?.value).filter(Boolean))];
    const deliveryModes = [...new Set(offerings.map((o) => o.attendance_mode?.value).filter(Boolean))];

    // Strip HTML from description
    const description = (pageContent.description || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&\w+;/g, ' ')
      .trim()
      .slice(0, 2000);

    // Strip HTML from prerequisites
    const prerequisites = (pageContent.pre_requisites || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&\w+;/g, ' ')
      .trim();

    return {
      topic_code: (pageContent.code || urlCode).toUpperCase(),
      title: pageContent.title || '',
      description: description || null,
      credit_points: pageContent.credit_points_display || pageContent.credit_points || null,
      level: pageContent.level?.label || null,
      school: pageContent.school?.value || pageContent.parent_record?.value || null,
      academic_org: pageContent.academic_org?.value || null,
      year: TOPIC_YEAR,
      semesters: semesters.length > 0 ? semesters : null,
      campuses: campuses.length > 0 ? campuses : null,
      delivery_modes: deliveryModes.length > 0 ? deliveryModes : null,
      prerequisites: prerequisites || null,
      handbook_url: url,
      crawled_at: new Date().toISOString(),
    };
  } catch (err) {
    console.log(`[topic-crawler] Failed to parse: ${url}`, err.message);
    return null;
  }
}

/**
 * Process URLs in batches with delay to be respectful to the server.
 */
async function processBatch(urls) {
  const results = await Promise.all(urls.map((url) => fetchTopicData(url)));
  return results.filter(Boolean);
}

/**
 * Run the full topic crawl: fetch sitemap → scrape each topic → upsert to DB.
 */
async function crawlFlindersTopics() {
  console.log('[topic-crawler] Starting topic crawl...');
  const start = Date.now();

  try {
    const urls = await getTopicUrls();
    if (urls.length === 0) {
      console.log('[topic-crawler] No topic URLs found, aborting');
      return { upserted: 0, total: 0 };
    }

    let upserted = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const topics = await processBatch(batch);

      for (const topic of topics) {
        const { error } = await supabaseAdmin
          .from('flinders_topics')
          .upsert(topic, { onConflict: 'topic_code,year' });

        if (error) {
          failed++;
          if (failed <= 5) console.log(`[topic-crawler] Upsert error for ${topic.topic_code}:`, error.message);
        } else {
          upserted++;
        }
      }

      // Progress log every 100
      if ((i + BATCH_SIZE) % 100 < BATCH_SIZE) {
        console.log(`[topic-crawler] Progress: ${Math.min(i + BATCH_SIZE, urls.length)}/${urls.length} (${upserted} upserted)`);
      }

      // Rate limit: delay between batches
      if (i + BATCH_SIZE < urls.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[topic-crawler] Done in ${duration}s: ${upserted} upserted, ${failed} failed out of ${urls.length} URLs`);
    return { upserted, failed, total: urls.length, duration };
  } catch (err) {
    console.error('[topic-crawler] Crawl failed:', err.message);
    return { error: err.message };
  }
}

/**
 * Start the topic crawler on a weekly schedule.
 */
function startTopicCrawler() {
  // Run initial crawl after a short delay (let server boot first)
  setTimeout(() => crawlFlindersTopics(), 15000);

  // Re-crawl weekly (every 7 days)
  const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
  setInterval(crawlFlindersTopics, WEEKLY_MS);
  console.log('[topic-crawler] Scheduled weekly crawl');
}

/**
 * Fetch and upsert a single topic by code (on-demand when search misses).
 */
async function fetchSingleTopic(topicCode) {
  const code = topicCode.trim().toLowerCase();
  const url = `https://handbook.flinders.edu.au/topics/${TOPIC_YEAR}/${code}`;
  const data = await fetchTopicData(url);
  if (!data) return null;

  const { error } = await supabaseAdmin
    .from('flinders_topics')
    .upsert(data, { onConflict: 'topic_code,year' });

  if (error) {
    console.log(`[topic-crawler] Single upsert error for ${topicCode}:`, error.message);
    return null;
  }

  console.log(`[topic-crawler] On-demand fetched: ${data.topic_code} — ${data.title}`);
  return data;
}

module.exports = { crawlFlindersTopics, startTopicCrawler, fetchSingleTopic };
