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
  const monthPattern = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';

  // Both times have am/pm
  const bothAmPm = text.match(
    new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4}),?\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))\\s*[–\\-]\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))`, 'i')
  );
  if (bothAmPm) {
    const day = parseInt(bothAmPm[1]);
    const month = MONTHS[bothAmPm[2].toLowerCase()];
    const year = parseInt(bothAmPm[3]);
    const st = parseTime(bothAmPm[4]);
    const et = parseTime(bothAmPm[5]);
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: et ? new Date(year, month, day, et.h, et.m).toISOString() : null,
      time_display: `${bothAmPm[4].trim()} – ${bothAmPm[5].trim()}`,
    };
  }

  // Only end time has am/pm — "12:15 – 1:00 pm"
  const endOnlyAmPm = text.match(
    new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4}),?\\s*(\\d{1,2}(?::\\d{2})?)\\s*[–\\-]\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))`, 'i')
  );
  if (endOnlyAmPm) {
    const day = parseInt(endOnlyAmPm[1]);
    const month = MONTHS[endOnlyAmPm[2].toLowerCase()];
    const year = parseInt(endOnlyAmPm[3]);
    const et = parseTime(endOnlyAmPm[5]);
    const startRaw = endOnlyAmPm[4].trim();
    const endAmPm = endOnlyAmPm[5].match(/(am|pm)/i)?.[1] || 'am';
    const st = parseTime(startRaw + endAmPm);
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: et ? new Date(year, month, day, et.h, et.m).toISOString() : null,
      time_display: `${startRaw} – ${endOnlyAmPm[5].trim()}`,
    };
  }

  // Single time
  const singleTime = text.match(
    new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4}),?\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))`, 'i')
  );
  if (singleTime) {
    const day = parseInt(singleTime[1]);
    const month = MONTHS[singleTime[2].toLowerCase()];
    const year = parseInt(singleTime[3]);
    const st = parseTime(singleTime[4]);
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: null,
      time_display: singleTime[4].trim(),
    };
  }

  // Date only
  const dateOnly = text.match(
    new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})`, 'i')
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

/**
 * Fetch individual event page and parse JSON-LD schema for date/time/location.
 * Used as fallback when content.rendered is empty.
 */
async function fetchEventPageSchema(eventUrl) {
  if (!eventUrl) return null;
  try {
    const res = await fetch(eventUrl);
    if (!res.ok) return null;
    const html = await res.text();
    // Extract JSON-LD script
    const ldMatch = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!ldMatch) return null;
    const ld = JSON.parse(ldMatch[1]);
    // Handle @graph wrapper, top-level array, or single object
    let event = null;
    if (ld['@graph'] && Array.isArray(ld['@graph'])) {
      event = ld['@graph'].find((o) => o['@type'] === 'Event');
    } else if (Array.isArray(ld)) {
      event = ld.find((o) => o['@type'] === 'Event');
    } else if (ld['@type'] === 'Event') {
      event = ld;
    }
    if (!event) return null;

    const result = {};

    // Parse startDate like "2026-4-1T11:00+10.5:00"
    if (event.startDate) {
      const sd = parseSchemaDate(event.startDate);
      if (sd) result.start_time = sd.toISOString();
    }
    if (event.endDate) {
      const ed = parseSchemaDate(event.endDate);
      if (ed) result.end_time = ed.toISOString();
    }

    // Build time_display from start/end
    if (result.start_time) {
      const s = new Date(result.start_time);
      const startStr = formatTimeAmPm(s);
      if (result.end_time) {
        const e = new Date(result.end_time);
        result.time_display = `${startStr} – ${formatTimeAmPm(e)}`;
      } else {
        result.time_display = startStr;
      }
    }

    // Parse location
    if (event.location) {
      const loc = Array.isArray(event.location) ? event.location[0] : event.location;
      if (loc?.name) result.location = loc.name;
    }

    // Parse cost/registration info
    if (event.offers) {
      const offer = Array.isArray(event.offers) ? event.offers[0] : event.offers;
      if (offer?.price === 0 || offer?.price === '0') result.cost = 'Free';
      else if (offer?.price) result.cost = `$${offer.price}`;
    }
    const lowerHtml = html.toLowerCase();
    if (!result.cost) {
      if (/free\s+event/i.test(html) || /free\s+admission/i.test(html) || /no\s+cost/i.test(html) || /free\s+ticket/i.test(html) || /book\s+free/i.test(html) || /free\s+film/i.test(html) || /free\s+screening/i.test(html)) {
        result.cost = 'Free';
      } else if (/\$\d+/.test(html)) {
        const priceMatch = html.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) result.cost = `$${priceMatch[1]}`;
      } else if (lowerHtml.includes('eventbrite') || lowerHtml.includes('register')) {
        result.cost = 'Free · Registration required';
      }
    }

    return result;
  } catch (err) {
    console.log('[event-crawler] Schema fetch failed for', eventUrl, err.message);
    return null;
  }
}

/**
 * Parse schema.org date strings like "2026-4-1T11:00+10.5:00"
 */
function parseSchemaDate(dateStr) {
  if (!dateStr) return null;
  // Remove timezone offset for simpler parsing — treat as local
  const cleaned = dateStr.replace(/[+-]\d+\.?\d*:\d+$/, '');
  const m = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]));
}

function formatTimeAmPm(date) {
  let h = date.getHours();
  const min = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return min > 0 ? `${h}:${String(min).padStart(2, '0')}${ampm}` : `${h}${ampm}`;
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
      let parsed = parseEventDateFromContent(content);
      let location = parseLocationFromContent(content) || parseLocationFromClassList(classList);
      let cost = null;

      // Always fetch individual event page for reliable schema.org data
      if (ev.link) {
        const schema = await fetchEventPageSchema(ev.link);
        if (schema) {
          // Schema.org is the most reliable source — always prefer it
          if (schema.start_time) {
            parsed = {
              start_time: schema.start_time,
              end_time: schema.end_time || parsed?.end_time || null,
              time_display: schema.time_display || parsed?.time_display || '',
            };
          }
          if (schema.location) location = schema.location;
          if (schema.cost) cost = schema.cost;
        }
      }

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
        cost,
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
