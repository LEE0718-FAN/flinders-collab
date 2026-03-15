const { supabaseAdmin } = require('../services/supabase');

const WP_EVENTS_URL = 'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=50';

// Word-boundary keyword patterns for categorization
const categoryPatterns = {
  'IT & Computing': [/\bcomputer\b/i, /\bI\.?T\.?\b/, /\btech\b/i, /\btechnolog/i, /\bsoftware\b/i, /\bcyber/i, /\bdata\b/i, /\bdigital\b/i, /\b(?:A\.?I\.?|artificial intelligence)\b/i, /\bmachine learning\b/i, /\bcoding\b/i, /\bprogramming\b/i, /\bhackathon\b/i, /\binformation technology\b/i, /\bSTEM\b/],
  'Engineering': [/\bengineering\b/i, /\bmechanical\b/i, /\bcivil\b/i, /\belectrical\b/i, /\brobotic/i, /\bmaritime\b/i],
  'Health & Medicine': [/\bhealth\b/i, /\bmedicin/i, /\bnursing\b/i, /\bmedical\b/i, /\bclinical\b/i, /\bnutrition/i, /\bparamedic/i, /\bphysiotherap/i, /\bwellbeing\b/i, /\bmental health\b/i],
  'Business & Law': [/\bbusiness\b/i, /\b(?:^|\s)law(?:\s|$)/i, /\baccounting\b/i, /\bfinance\b/i, /\bcommerce\b/i, /\bMBA\b/, /\bentrepreneurship\b/i, /\bcorporate\b/i],
  'Education': [/\beducation\b/i, /\bteaching\b/i, /\bteacher\b/i, /\bSTEM education\b/i],
  'Arts & Creative': [/\bcreative arts?\b/i, /\bdesign\b/i, /\bfilm\b/i, /\bfashion\b/i, /\bperformance\b/i, /\bvisual art/i, /\bmusic\b/i, /\bcostume\b/i, /\btheatre\b/i, /\bdrama\b/i],
  'Science': [/\bscience\b/i, /\bbiology\b/i, /\bchemistry\b/i, /\bmarine\b/i, /\benvironmental\b/i, /\bforensic\b/i, /\bbiodiversity\b/i],
  'Career': [/\bcareer/i, /\bemployment\b/i, /\bjob\b/i, /\binternship/i, /\bresume\b/i, /\bnetworking\b/i, /\bprofessional development\b/i, /\bwork placement\b/i, /\bcareer expo\b/i, /\bcareer fair\b/i, /\brecruit/i],
};

function stripHtmlTags(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&#\d+;/g, ' ').replace(/&\w+;/g, ' ').trim();
}

function categorizeEvent(title, excerpt) {
  const text = `${stripHtmlTags(title)} ${stripHtmlTags(excerpt)}`;
  const matched = [];
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some((re) => re.test(text))) {
      matched.push(category);
    }
  }
  if (matched.length === 0) matched.push('General');
  return matched;
}

/**
 * Extract event metadata (time, location, cost) from WordPress event data.
 */
function extractEventMeta(ev) {
  const meta = ev.meta || {};

  const srow = meta.evcal_srow || meta._evcal_srow || meta.start_date || null;
  const erow = meta.evcal_erow || meta._evcal_erow || meta.end_date || null;

  let start_time = null;
  let end_time = null;

  if (srow) {
    const ts = Number(srow);
    start_time = ts > 1e9 ? new Date(ts * 1000).toISOString() : String(srow);
  }
  if (erow) {
    const ts = Number(erow);
    end_time = ts > 1e9 ? new Date(ts * 1000).toISOString() : String(erow);
  }

  const location = stripHtmlTags(
    String(meta.evcal_location || meta._evcal_location || meta.location || meta.venue || ev.location || ev.venue || '')
  );

  let cost = String(meta.evcal_cost || meta._evcal_cost || meta.cost || meta.ticket_cost || '').trim();
  if (!cost) {
    const text = stripHtmlTags((ev.excerpt?.rendered || '') + ' ' + (ev.content?.rendered || ''));
    if (/\bfree\b/i.test(text)) cost = 'Free';
    else if (/\$\d/.test(text)) {
      const m = text.match(/\$[\d,.]+/);
      if (m) cost = m[0];
    } else if (/\bregist(?:er|ration)\b/i.test(text) && !/\bpaid\b/i.test(text)) {
      cost = 'Free registration';
    }
  }

  return { start_time, end_time, location, cost };
}

/**
 * Crawl Flinders University events from WordPress API and cache in DB.
 * Runs automatically every 24 hours.
 */
async function crawlFlindersEvents() {
  console.log('[event-crawler] Starting daily event crawl...');

  try {
    const response = await fetch(WP_EVENTS_URL);
    if (!response.ok) {
      console.log('[event-crawler] WordPress API returned', response.status);
      return;
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.log('[event-crawler] Unexpected response format');
      return;
    }

    // Log sample meta structure for debugging
    if (data.length > 0) {
      console.log('[event-crawler] Sample event meta keys:', Object.keys(data[0].meta || {}));
    }

    let upserted = 0;
    for (const ev of data) {
      const title = ev.title?.rendered || '';
      const excerpt = ev.excerpt?.rendered || '';
      const categories = categorizeEvent(title, excerpt);
      const meta = extractEventMeta(ev);

      const record = {
        wp_id: ev.id,
        title,
        excerpt,
        link: ev.link || '',
        image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        event_date: meta.start_time || ev.date || null,
        categories,
        location: meta.location || null,
        start_time: meta.start_time || null,
        end_time: meta.end_time || null,
        cost: meta.cost || null,
        raw_json: ev,
        crawled_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('flinders_events_cache')
        .upsert(record, { onConflict: 'wp_id' });

      if (!error) upserted++;
    }

    // Clean up old events (past 30 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    await supabaseAdmin
      .from('flinders_events_cache')
      .delete()
      .lt('event_date', cutoff.toISOString());

    console.log(`[event-crawler] Crawled ${upserted}/${data.length} events, cleaned old entries`);
  } catch (err) {
    console.error('[event-crawler] Error:', err.message);
  }
}

/**
 * Start the daily event crawler.
 * Runs immediately on startup, then every 24 hours.
 */
function startEventCrawler() {
  // Run immediately on startup
  crawlFlindersEvents();

  // Then every 24 hours
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(crawlFlindersEvents, INTERVAL_MS);
  console.log('[event-crawler] Scheduled daily crawl (every 24h)');
}

module.exports = { crawlFlindersEvents, startEventCrawler };
