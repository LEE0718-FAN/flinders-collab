const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { crawlFlindersEvents } = require('../utils/eventCrawler');

router.use(authenticate);

// Shared categorization logic
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
  // Only use title + excerpt for categorization — class_list CSS tags are too generic
  // (audience tags like "future-students", "taster-days" cause false positives)
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

/**
 * Parse actual event date/time from content HTML.
 * Handles patterns like:
 *   "16 March 2026, 10am – 11:15am"
 *   "9 April 2026 12:15 – 1:00 pm" (only end has am/pm)
 *   "10 June 2026 5:00 pm - 7:00 pm"
 */
function parseEventDateFromContent(contentHtml) {
  if (!contentHtml) return null;
  const text = stripHtmlTags(contentHtml);

  const monthPattern = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';

  // Pattern 1: Both times have am/pm — "10am – 11:15am"
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

  // Pattern 2: Only end time has am/pm — "12:15 – 1:00 pm"
  const endOnlyAmPm = text.match(
    new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4}),?\\s*(\\d{1,2}(?::\\d{2})?)\\s*[–\\-]\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))`, 'i')
  );
  if (endOnlyAmPm) {
    const day = parseInt(endOnlyAmPm[1]);
    const month = MONTHS[endOnlyAmPm[2].toLowerCase()];
    const year = parseInt(endOnlyAmPm[3]);
    const et = parseTime(endOnlyAmPm[5]);
    // Infer start am/pm from end time
    const startRaw = endOnlyAmPm[4].trim();
    const endAmPm = endOnlyAmPm[5].match(/(am|pm)/i)?.[1] || 'am';
    const st = parseTime(startRaw + endAmPm);
    const startDisplay = startRaw.includes(':') ? startRaw : startRaw;
    const endDisplay = endOnlyAmPm[5].trim();
    return {
      start_time: new Date(year, month, day, st?.h || 0, st?.m || 0).toISOString(),
      end_time: et ? new Date(year, month, day, et.h, et.m).toISOString() : null,
      time_display: `${startDisplay} – ${endDisplay}`,
    };
  }

  // Pattern 3: Single time — "16 March 2026, 10am"
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

  // Pattern 4: Date only — "16 March 2026"
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

/**
 * Parse location from class_list CSS classes.
 * e.g. "event_location-flinders-city-campus-level-3-room-309"
 */
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

/**
 * Parse location from content HTML bold tags.
 * e.g. <strong>Flinders City Campus | Level 3 | Room 309</strong>
 */
function parseLocationFromContent(contentHtml) {
  if (!contentHtml) return '';
  const boldBlocks = contentHtml.match(/<strong>([^<]+)<\/strong>/gi) || [];
  for (const block of boldBlocks) {
    const text = stripHtmlTags(block);
    // Skip date strings
    if (/\d{4}/.test(text) && /(?:am|pm)/i.test(text)) continue;
    if (/(?:Campus|Room|Building|Hall|Library|Theatre|Online|Level)/i.test(text)) {
      return text;
    }
  }
  return '';
}

/**
 * Parse schema.org date strings like "2026-4-1T11:00+10.5:00"
 */
function parseSchemaDate(dateStr) {
  if (!dateStr) return null;
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

/**
 * Fetch individual event page and parse JSON-LD schema for date/time/location.
 */
async function fetchEventPageSchema(eventUrl) {
  if (!eventUrl) return null;
  try {
    const res = await fetch(eventUrl);
    if (!res.ok) return null;
    const html = await res.text();
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
    if (event.startDate) {
      const sd = parseSchemaDate(event.startDate);
      if (sd) result.start_time = sd.toISOString();
    }
    if (event.endDate) {
      const ed = parseSchemaDate(event.endDate);
      if (ed) result.end_time = ed.toISOString();
    }
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
    if (event.location) {
      const loc = Array.isArray(event.location) ? event.location[0] : event.location;
      if (loc?.name) result.location = loc.name;
    }

    // Parse cost/registration info from page content
    if (event.offers) {
      const offer = Array.isArray(event.offers) ? event.offers[0] : event.offers;
      if (offer?.price === 0 || offer?.price === '0') result.cost = 'Free';
      else if (offer?.price) result.cost = `$${offer.price}`;
    }
    // Check page text for cost clues
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
  } catch {
    return null;
  }
}

function mapWpEvent(ev) {
  const title = ev.title?.rendered || '';
  const excerpt = ev.excerpt?.rendered || '';
  const content = ev.content?.rendered || '';
  const classList = ev.class_list || [];

  // Parse actual event date from content HTML
  const parsed = parseEventDateFromContent(content);

  // Parse location from class_list and content
  let location = parseLocationFromContent(content) || parseLocationFromClassList(classList);
  // Check if online event
  if (!location && classList.some((c) => c.includes('online'))) {
    location = 'Online';
  }

  return {
    id: ev.id,
    title,
    date: parsed?.start_time || ev.date || '',
    excerpt,
    link: ev.link || '',
    image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    categories: categorizeEvent(title, excerpt + ' ' + content),
    location,
    start_time: parsed?.start_time || null,
    end_time: parsed?.end_time || null,
    time_display: parsed?.time_display || '',
    cost: '',
    _needsSchemaFetch: !!ev.link,
    _link: ev.link || '',
  };
}

/**
 * Enrich events that have no content by fetching individual event pages.
 * Runs schema fetches in parallel (max 5 concurrent).
 */
async function enrichEventsWithSchema(events) {
  const needsFetch = events.filter((e) => e._needsSchemaFetch);
  if (needsFetch.length === 0) return events;

  const results = await Promise.all(
    needsFetch.map((e) => fetchEventPageSchema(e._link))
  );

  const schemaMap = new Map();
  needsFetch.forEach((e, i) => {
    if (results[i]) schemaMap.set(e.id, results[i]);
  });

  return events.map((e) => {
    const schema = schemaMap.get(e.id);
    if (schema) {
      // Schema.org data is the most reliable — always prefer it
      if (schema.start_time) {
        e.start_time = schema.start_time;
        e.date = schema.start_time;
      }
      if (schema.end_time) e.end_time = schema.end_time;
      if (schema.time_display) e.time_display = schema.time_display;
      if (schema.location) e.location = schema.location;
      if (schema.cost) e.cost = schema.cost;
    }
    delete e._needsSchemaFetch;
    delete e._link;
    return e;
  });
}

// GET /api/flinders/events
router.get('/flinders/events', async (req, res) => {
  try {
    const response = await fetch(
      'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=20'
    );
    if (!response.ok) return res.json([]);
    const data = await response.json();
    let events = (Array.isArray(data) ? data : []).map(mapWpEvent);
    events = await enrichEventsWithSchema(events);
    res.json(events);
  } catch (err) {
    console.error('Flinders events proxy error:', err.message);
    res.json([]);
  }
});

// GET /api/flinders/recommended-events
router.get('/flinders/recommended-events', async (req, res) => {
  try {
    const interests = req.query.interests
      ? req.query.interests.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let events = [];

    // Try DB cache first
    try {
      const { data: cached } = await supabaseAdmin
        .from('flinders_events_cache')
        .select('*')
        .order('event_date', { ascending: true });

      if (cached && cached.length > 0) {
        events = cached.map((row) => ({
          id: row.wp_id,
          title: row.title,
          date: row.start_time || row.event_date || '',
          excerpt: row.excerpt || '',
          link: row.link || '',
          image: row.image || null,
          categories: row.categories || categorizeEvent(row.title, row.excerpt),
          location: row.location || '',
          start_time: row.start_time || null,
          end_time: row.end_time || null,
          time_display: row.time_display || '',
          cost: row.cost || '',
          // Mark events missing time for schema enrichment
          _needsSchemaFetch: !row.time_display && !!row.link,
          _link: row.link || '',
        }));
        // Enrich cached events missing time/location from schema.org
        events = await enrichEventsWithSchema(events);
        // Re-categorize with updated data (strip class_list noise)
        events = events.map((e) => ({
          ...e,
          categories: categorizeEvent(e.title, e.excerpt),
        }));
      }
    } catch {
      // Cache table may not exist yet
    }

    // Fallback: live WordPress API
    if (events.length === 0) {
      try {
        const response = await fetch(
          'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=50'
        );
        if (response.ok) {
          const data = await response.json();
          events = (Array.isArray(data) ? data : []).map(mapWpEvent);
          events = await enrichEventsWithSchema(events);
          crawlFlindersEvents().catch(() => {});
        }
      } catch {
        // Both failed
      }
    }

    // Filter past events — only show today and future
    events = events.filter((e) => {
      if (!e.date) return true; // keep events without dates
      try {
        return new Date(e.date) >= today;
      } catch {
        return true;
      }
    });

    events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    const career = events.filter((e) => e.categories.includes('Career'));
    const recommended = interests.length > 0
      ? events.filter((e) => e.categories.some((c) => interests.includes(c)))
      : [];

    res.json({ recommended, career, all: events });
  } catch (err) {
    console.error('Flinders recommended events error:', err.message);
    res.json({ recommended: [], career: [], all: [] });
  }
});

// GET /api/flinders/news — proxy Flinders student news
router.get('/flinders/news', async (req, res) => {
  try {
    const response = await fetch(
      'https://news.flinders.edu.au/wp-json/wp/v2/posts?per_page=10&categories=students'
    );
    if (!response.ok) return res.json([]);
    const data = await response.json();
    const articles = (Array.isArray(data) ? data : []).map((post) => ({
      id: post.id,
      title: post.title?.rendered || '',
      date: post.date || '',
      excerpt: post.excerpt?.rendered || '',
      link: post.link || '',
      image: post.featured_image_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    }));
    res.json(articles);
  } catch (err) {
    console.error('Flinders news proxy error:', err.message);
    res.json([]);
  }
});

module.exports = router;
