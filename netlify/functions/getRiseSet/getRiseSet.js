const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { lat, lon } = JSON.parse(event.body);
    
    // Validate input
    if (!lat || !lon) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Latitude and longitude are required' })
      };
    }

    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create the AstronomyAPI request
    const response = await axios.get('https://api.astronomyapi.com/api/v2/bodies/positions', {
      params: {
        latitude: lat,
        longitude: lon,
        elevation: 0,
        from_date: today,
        to_date: today,
        time: '00:00:00',
        bodies: ['moon', 'jupiter', 'saturn', 'venus', 'mars']
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ASTRONOMY_API_ID}:${process.env.ASTRONOMY_API_SECRET}`).toString('base64')}`
      }
    });

    // Process the response to match the expected format
    const planets = response.data.data.positions.map(position => {
      const name = position.body.name.toLowerCase();
      return {
        entry: {
          body: name,
          rise: new Date(position.rise).toISOString(),
          set: new Date(position.set).toISOString()
        }
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          table: {
            rows: planets
          }
        }
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch planet data' })
    };
  }
}; 