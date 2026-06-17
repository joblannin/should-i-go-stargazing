const axios = require('axios');

const BORTLE_LABELS = {
  1: { label: 'Class 1 — Truly Dark',        description: 'Zodiacal light and gegenschein visible. Best skies on Earth.',             color: '#a0c4ff' },
  2: { label: 'Class 2 — Pristine Dark',      description: 'Airglow faintly visible. Excellent for all deep-sky objects.',             color: '#90b8ff' },
  3: { label: 'Class 3 — Rural',              description: 'Some light domes on horizon. Great for most deep-sky objects.',             color: '#70a0ff' },
  4: { label: 'Class 4 — Rural/Suburban',     description: 'Milky Way still impressive but light domes visible over towns.',           color: '#80d080' },
  5: { label: 'Class 5 — Suburban',           description: 'Milky Way washed out overhead. Good for brighter deep-sky objects.',       color: '#d4e000' },
  6: { label: 'Class 6 — Bright Suburban',    description: 'Milky Way only at best. Bright nebulae and clusters still rewarding.',     color: '#ffb030' },
  7: { label: 'Class 7 — Suburban/Urban',     description: 'Milky Way invisible. Limited to bright clusters, planets and the Moon.',   color: '#ff7030' },
  8: { label: 'Class 8 — City',               description: 'Only a few dozen stars visible. Planets and the Moon only.',               color: '#ff3010' },
  9: { label: 'Class 9 — Inner City',         description: 'Fewer than 20 stars visible. Severe light pollution.',                     color: '#ff1010' },
};

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const lat = parseFloat(event.queryStringParameters?.lat);
  const lon = parseFloat(event.queryStringParameters?.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'lat and lon query params required' }) };
  }

  try {
    // Clear Outside provides Bortle scale and SQM in their public forecast page
    const url = `https://clearoutside.com/forecast/${lat.toFixed(4)}/${lon.toFixed(4)}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShouldIGoStargazing/1.0)',
        'Accept': 'text/html',
      },
    });

    const html = response.data;

    // Extract Bortle class from class name: btn-bortle-8
    const bortleMatch = html.match(/btn-bortle-(\d)/);
    // Extract SQM magnitude: <strong>18.04</strong> Magnitude
    const sqmMatch = html.match(/<strong>([\d.]+)<\/strong>\s*Magnitude/);
    // Extract mcd/m² brightness
    const mcdMatch = html.match(/<strong>([\d.]+)<\/strong>\s*mcd/);

    if (!bortleMatch) {
      throw new Error('Could not parse Bortle value from Clear Outside');
    }

    const bortle = parseInt(bortleMatch[1], 10);
    const sqm    = sqmMatch ? parseFloat(sqmMatch[1]) : null;
    const mcd    = mcdMatch ? parseFloat(mcdMatch[1]) : null;
    const info   = BORTLE_LABELS[bortle] || BORTLE_LABELS[9];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bortle, sqm, mcd, ...info }),
    };

  } catch (error) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Light pollution data unavailable', details: error.message }),
    };
  }
};
