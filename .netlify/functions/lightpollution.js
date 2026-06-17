const axios = require('axios');

// Convert artificial sky brightness ratio (P = artificial / natural background)
// to Bortle scale. Natural zenith sky ≈ 0.174 mcd/m².
// Source: Falchi et al. 2016, World Atlas of Artificial Night Sky Brightness.
function toBortle(raw) {
  // The wa_2015 dataset returns mcd/m² of artificial brightness.
  // Divide by natural background (0.174 mcd/m²) to get ratio P.
  const p = raw / 0.174;
  if (p < 0.01) return 1;
  if (p < 0.06) return 2;
  if (p < 0.18) return 3;
  if (p < 0.55) return 4;
  if (p < 1.5)  return 5;
  if (p < 5)    return 6;
  if (p < 16)   return 7;
  if (p < 50)   return 8;
  return 9;
}

const BORTLE_LABELS = {
  1: { label: 'Class 1 — Truly Dark', description: 'Zodiacal light, gegenschein visible. Best skies on Earth.', color: '#1a1a2e' },
  2: { label: 'Class 2 — Pristine Dark', description: 'Airglow visible on horizon. Excellent conditions for deep-sky.', color: '#16213e' },
  3: { label: 'Class 3 — Rural', description: 'Some light domes on horizon. Great for most deep-sky objects.', color: '#0f3460' },
  4: { label: 'Class 4 — Rural/Suburban', description: 'Milky Way still impressive. Light domes over nearby towns.', color: '#1a4a1a' },
  5: { label: 'Class 5 — Suburban', description: 'Milky Way washed out overhead. Good for brighter objects.', color: '#4a5500' },
  6: { label: 'Class 6 — Bright Suburban', description: 'Milky Way faint at best. Only bright nebulae visible.', color: '#7a5500' },
  7: { label: 'Class 7 — Suburban/Urban', description: 'Milky Way invisible. Limited to bright clusters and planets.', color: '#8a3300' },
  8: { label: 'Class 8 — City', description: 'Only a few dozen stars visible. Planets and the Moon only.', color: '#8a1100' },
  9: { label: 'Class 9 — Inner City', description: 'Less than 20 stars visible. Severe light pollution.', color: '#6a0000' },
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
    const qd = JSON.stringify({ lng: lon, lat: lat });
    const url = `https://www.lightpollutionmap.info/QueryRaster/?ql=wa_2015&qt=point&qd=${encodeURIComponent(qd)}`;

    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'ShouldIGoStargazing/1.0' },
    });

    // The API returns { "data": [{ "result": <mcd/m²> }] }
    const raw = response.data?.data?.[0]?.result ?? response.data?.result;
    if (raw == null || isNaN(Number(raw))) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Unexpected API response', raw: response.data }) };
    }

    const bortle = toBortle(Number(raw));
    const info   = BORTLE_LABELS[bortle];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bortle, raw: Number(raw), ...info }),
    };

  } catch (error) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Light pollution API unavailable', details: error.message }),
    };
  }
};
