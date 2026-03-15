const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/flinders/events — proxy Flinders University events (WordPress REST API)
router.get('/flinders/events', async (req, res) => {
  try {
    const response = await fetch(
      'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=20'
    );

    if (!response.ok) {
      return res.json([]);
    }

    const data = await response.json();

    const events = (Array.isArray(data) ? data : []).map((ev) => ({
      id: ev.id,
      title: ev.title?.rendered || '',
      date: ev.date || '',
      excerpt: ev.excerpt?.rendered || '',
      link: ev.link || '',
      image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    }));

    res.json(events);
  } catch (err) {
    console.error('Flinders events proxy error:', err.message);
    res.json([]);
  }
});

// GET /api/flinders/recommended-events — AI-curated event recommendations
router.get('/flinders/recommended-events', async (req, res) => {
  try {
    const interests = req.query.interests
      ? req.query.interests.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const response = await fetch(
      'https://events.flinders.edu.au/wp-json/wp/v2/ajde_events?per_page=20'
    );

    if (!response.ok) {
      return res.json({ recommended: [], career: [], all: [] });
    }

    const data = await response.json();

    // Word-boundary keyword patterns (avoid false matches like 'it' in 'Student')
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
      return (html || '').replace(/<[^>]*>/g, '').replace(/&#\d+;/g, ' ').replace(/&\w+;/g, ' ');
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

    const events = (Array.isArray(data) ? data : []).map((ev) => {
      const title = ev.title?.rendered || '';
      const excerpt = ev.excerpt?.rendered || '';
      const categories = categorizeEvent(title, excerpt);
      return {
        id: ev.id,
        title,
        date: ev.date || '',
        excerpt,
        link: ev.link || '',
        image: ev.featured_image_url || ev._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        categories,
      };
    });

    // Sort by date descending (newest first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

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

// GET /api/flinders/news — proxy Flinders student news (WordPress REST API)
router.get('/flinders/news', async (req, res) => {
  try {
    const response = await fetch(
      'https://news.flinders.edu.au/wp-json/wp/v2/posts?per_page=10&categories=students'
    );

    if (!response.ok) {
      return res.json([]);
    }

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
