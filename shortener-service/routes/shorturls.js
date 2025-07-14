// routes/shorturls.js
const express = require('express');
const { nanoid } = require('nanoid');
const Log = require('../logger');

const router = express.Router();

// In-memory stores
const store = {};     // shortcode → { url, expiresAt }
const stats = {};     // shortcode → { created, clicks: [], originalUrl }

// Helper to check expiry
function isExpired(entry) {
  return Date.now() > entry.expiresAt;
}

// CREATE short URL
router.post('/', async (req, res) => {
  const { url, validity = 30, shortcode } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  const code = shortcode || nanoid(6);
  if (store[code] && !isExpired(store[code])) {
    return res.status(409).json({ error: 'shortcode already in use' });
  }

  const expiresAt = Date.now() + validity * 60000;
  store[code] = { url, expiresAt };
  stats[code] = { created: new Date().toISOString(), clicks: [], originalUrl: url };

  await Log('backend','info','service', `Created ${code} → ${url}`);
  return res.status(201).json({
    shortLink: `${req.protocol}://${req.get('host')}/${code}`,
    expiry: new Date(expiresAt).toISOString()
  });
});

// REDIRECT
router.get('/:code', async (req, res) => {
  const entry = store[req.params.code];
  if (!entry || isExpired(entry)) {
    await Log('backend','warn','route', `Invalid or expired code: ${req.params.code}`);
    return res.status(404).json({ error: 'Not found or expired' });
  }

  // record click
  stats[req.params.code].clicks.push({
    at: new Date().toISOString(),
    referrer: req.get('referrer') || null
  });

  await Log('backend','info','route', `Redirect ${req.params.code}`);
  return res.redirect(entry.url);
});

// STATS
router.get('/:code/stats', (req, res) => {
  const s = stats[req.params.code];
  if (!s) return res.status(404).json({ error: 'Not found' });
  return res.json(s);
});

module.exports = router;
