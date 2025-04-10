const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('Function started');
  console.log('Environment variables available:', Object.keys(process.env));
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log('Invalid HTTP method:', event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Request body:', event.body);
    const { lat, lon } = JSON.parse(event.body);
    console.log('Received coordinates:', { lat, lon });
    
    // Validate input
    if (!lat || !lon) {
      console.log('Missing coordinates');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Latitude and longitude are required' })
      };
    }

    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log('Using date:', today);

    // Create the AstronomyAPI request
    console.log('Making request to AstronomyAPI');
    const authHeader = `Basic ${Buffer.from(`${process.env.AstronomyAPIID}:${process.env.AstronomyAPISecret}`).toString('base64')}`;
    console.log('Auth header length:', authHeader.length);
    
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
        'Authorization': authHeader
      }
    });

    console.log('AstronomyAPI response received:', response.status);
    
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

    console.log('Processed planets:', planets);

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
    console.error('Detailed error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch planet data',
        details: error.message,
        response: error.response?.data
      })
    };
  }
}; 