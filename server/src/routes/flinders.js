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

    const categoryKeywords = {
      'IT & Computing': ['computer', 'it', 'tech', 'software', 'cyber', 'data', 'digital', 'ai', 'artificial intelligence', 'machine learning', 'coding', 'programming', 'hackathon', 'information technology'],
      'Engineering': ['engineering', 'mechanical', 'civil', 'electrical', 'robotics', 'maritime'],
      'Health & Medicine': ['health', 'medicine', 'nursing', 'medical', 'clinical', 'nutrition', 'paramedic', 'physiotherapy'],
      'Business & Law': ['business', 'law', 'accounting', 'finance', 'commerce', 'mba', 'management', 'entrepreneurship'],
      'Education': ['education', 'teaching', 'teacher', 'learning', 'stem education'],
      'Arts & Creative': ['art', 'creative', 'design', 'film', 'fashion', 'media', 'performance', 'visual', 'music'],
      'Science': ['science', 'biology', 'chemistry', 'marine', 'environmental', 'forensic', 'biodiversity'],
      'Career': ['career', 'employment', 'job', 'internship', 'graduate', 'resume', 'networking', 'industry', 'professional', 'work placement'],
    };

    function categorizeEvent(title, excerpt) {
      const text = `${title} ${excerpt}`.toLowerCase();
      const matched = [];
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some((kw) => text.includes(kw))) {
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
