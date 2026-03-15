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
 * Looks for patterns like "Monday 16 March 2026, 10am – 11:15am"
 */
function parseEventDateFromContent(contentHtml) {
  if (!contentHtml) return null;
  const text = stripHtmlTags(contentHtml);

  // Pattern: "16 March 2026, 10am – 11:15am" or "10 June 2026 5:00 pm - 7:00 pm"
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

  // Pattern: "16 March 2026, 10am" (no end time)
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

  // Pattern: just date "16 March 2026" without time
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
  };
}

// GET /api/flinders/events
router.get('/flinders/events', async (req, res) => {
  try {
    const response = await fetch(
      'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=20'
    );
    if (!response.ok) return res.json([]);
    const data = await response.json();
    const events = (Array.isArray(data) ? data : []).map(mapWpEvent);
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
