const { supabaseAdmin } = require('../services/supabase');

const WP_EVENTS_URL = 'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=50';

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

const MONTHS = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };

function parseTime(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2] || '0');
  if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12;
  if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
  return { h, m: min };
}

function parseEventDateFromContent(contentHtml) {
  if (!contentHtml) return null;
  const text = stripHtmlTags(contentHtml);

  const dateTimeMatch = text.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4}),?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  if (dateTimeMatch) {
    const day = parseInt(dateTimeMatch[1]);
    const month = MONTHS[dateTimeMatch[2].toLowerCase()];
    const year = parseInt(dateTimeMatch[3]);
    const st = parseTime(dateTimeMatch[4]);
    const et = parseTime(dateTimeMatch[5]);
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: et ? new Date(year, month, day, et.h, et.m).toISOString() : null,
      time_display: `${dateTimeMatch[4].trim()} – ${dateTimeMatch[5].trim()}`,
    };
  }

  const dateTimePartial = text.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4}),?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  if (dateTimePartial) {
    const day = parseInt(dateTimePartial[1]);
    const month = MONTHS[dateTimePartial[2].toLowerCase()];
    const year = parseInt(dateTimePartial[3]);
    const st = parseTime(dateTimePartial[4]);
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: null,
      time_display: dateTimePartial[4].trim(),
    };
  }

  const dateOnly = text.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
  );
  if (dateOnly) {
    const day = parseInt(dateOnly[1]);
    const month = MONTHS[dateOnly[2].toLowerCase()];
    const year = parseInt(dateOnly[3]);
    return {
      start_time: new Date(year, month, day, 9, 0).toISOString(),
      end_time: null,
      time_display: '',
    };
  }

  return null;
}

function parseLocationFromClassList(classList) {
  if (!Array.isArray(classList)) return '';
  const locClass = classList.find((c) => c.startsWith('event_location-'));
  if (!locClass) return '';
  return locClass
    .replace('event_location-', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/(\s)(Level)(\s)/g, ' | Level ')
    .replace(/(\s)(Room)(\s)/g, ' | Room ')
    .replace(/(\s)(Building)(\s)/g, ' | Building ');
}

function parseLocationFromContent(contentHtml) {
  if (!contentHtml) return '';
  const boldBlocks = contentHtml.match(/<strong>([^<]+)<\/strong>/gi) || [];
  for (const block of boldBlocks) {
    const text = stripHtmlTags(block);
    if (/\d{4}/.test(text) && /(?:am|pm)/i.test(text)) continue;
    if (/(?:Campus|Room|Building|Hall|Library|Theatre|Online|Level)/i.test(text)) {
      return text;
    }
  }
  return '';
}

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

    let upserted = 0;
    for (const ev of data) {
      const title = ev.title?.rendered || '';
      const excerpt = ev.excerpt?.rendered || '';
      const content = ev.content?.rendered || '';
      const classList = ev.class_list || [];
      const categories = categorizeEvent(title, excerpt + ' ' + content);
      const parsed = parseEventDateFromContent(content);
      const location = parseLocationFromContent(content) || parseLocationFromClassList(classList);

      const record = {
        wp_id: ev.id,
        title,
        excerpt,
        link: ev.link || '',
        image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        event_date: parsed?.start_time || ev.date || null,
        categories,
        location: location || null,
        start_time: parsed?.start_time || null,
        end_time: parsed?.end_time || null,
        time_display: parsed?.time_display || null,
        cost: null,
        raw_json: ev,
        crawled_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('flinders_events_cache')
        .upsert(record, { onConflict: 'wp_id' });

      if (!error) upserted++;
      else console.log('[event-crawler] Upsert error:', error.message);
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

function startEventCrawler() {
  crawlFlindersEvents();
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(crawlFlindersEvents, INTERVAL_MS);
  console.log('[event-crawler] Scheduled daily crawl (every 24h)');
}

module.exports = { crawlFlindersEvents, startEventCrawler };
