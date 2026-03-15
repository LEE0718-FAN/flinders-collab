const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { crawlFlindersEvents } = require('../utils/eventCrawler');

router.use(authenticate);

// Shared categorization logic (also used in eventCrawler.js)
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
 * EventON plugin stores data in meta fields; field names vary by installation.
 */
function extractEventMeta(ev) {
  const meta = ev.meta || {};

  // --- Event start/end time ---
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

  // --- Location ---
  const location = stripHtmlTags(
    String(meta.evcal_location || meta._evcal_location || meta.location || meta.venue || ev.location || ev.venue || '')
  );

  // --- Cost / ticket ---
  let cost = String(meta.evcal_cost || meta._evcal_cost || meta.cost || meta.ticket_cost || '').trim();
  if (!cost) {
    // Try to detect from excerpt
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

function mapWpEvent(ev) {
  const title = ev.title?.rendered || '';
  const excerpt = ev.excerpt?.rendered || '';
  const meta = extractEventMeta(ev);
  return {
    id: ev.id,
    title,
    date: meta.start_time || ev.date || '',
    excerpt,
    link: ev.link || '',
    image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    categories: categorizeEvent(title, excerpt),
    location: meta.location,
    start_time: meta.start_time,
    end_time: meta.end_time,
    cost: meta.cost,
  };
}

// GET /api/flinders/events — proxy Flinders University events
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

// GET /api/flinders/recommended-events — AI-curated recommendations
// Tries DB cache first; falls back to live WordPress API
router.get('/flinders/recommended-events', async (req, res) => {
  try {
    const interests = req.query.interests
      ? req.query.interests.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

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
          cost: row.cost || '',
        }));
      }
    } catch {
      // Cache table may not exist yet — fall through to live API
    }

    // Fallback: live WordPress API if cache empty
    if (events.length === 0) {
      try {
        const response = await fetch(
          'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=50'
        );

        if (response.ok) {
          const data = await response.json();

          // Log first event structure for debugging meta fields
          if (Array.isArray(data) && data.length > 0) {
            const sample = data[0];
            console.log('[flinders] Sample event meta keys:', Object.keys(sample.meta || {}));
            console.log('[flinders] Sample event top-level keys:', Object.keys(sample));
          }

          events = (Array.isArray(data) ? data : []).map(mapWpEvent);

          // Sort by date ascending (soonest first)
          events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

          // Trigger background crawl to populate cache
          crawlFlindersEvents().catch(() => {});
        }
      } catch {
        // Both cache and live API failed
      }
    }

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
