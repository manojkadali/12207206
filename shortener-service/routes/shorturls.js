
const express = require('express');
const Log     = require('../logger');

const router = express.Router();

// In-memory stores
const store = {};   // shortcode → { url, expiresAt }
const stats = {};   // shortcode → { created, clicks: [], originalUrl }

function isExpired(entry) {
  return Date.now() > entry.expiresAt;
}

router.post('/', async (req, res) => {
 
  const { nanoid } = await import('nanoid');

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
  stats[code] = {
    created:     new Date().toISOString(),
    clicks:      [],
    originalUrl: url
  };

  await Log('backend','info','service', `Created ${code} → ${url}`);
  res.status(201).json({
    shortLink: `${req.protocol}://${req.get('host')}/${code}`,
    expiry:    new Date(expiresAt).toISOString()
  });
});

router.get('/:code', async (req, res) => {
  const entry = store[req.params.code];
  if (!entry || isExpired(entry)) {
    await Log('backend','warn','route', `Invalid/expired code: ${req.params.code}`);
    return res.status(404).json({ error: 'Not found or expired' });
  }

  stats[req.params.code].clicks.push({
    at:       new Date().toISOString(),
    referrer: req.get('referrer') || null
  });

  await Log('backend','info','route', `Redirect ${req.params.code}`);
  res.redirect(entry.url);
});

router.get('/:code/stats', (req, res) => {
  const s = stats[req.params.code];
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

module.exports = router;
