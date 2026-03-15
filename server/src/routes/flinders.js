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
