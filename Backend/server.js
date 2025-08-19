const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const DbService = require('./services/dbService');

const app = express();
const port = process.env.PORT || 3000;

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });
const dbService = new DbService();

app.use(cors());
app.use(express.json());

// Helper function to create cache key
function createCacheKey(from, to, date, time) {
  return `${from}-${to}-${date}-${time}`;
}

// Station lookup endpoint
app.post('/api/stations', async (req, res) => {
  try {
    const { query, results = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Missing required field: query' 
      });
    }

    console.log(`🔍 Station lookup: "${query}"`);

    const stations = await dbService.searchStations(query, results);

    res.json(stations);

  } catch (error) {
    console.error('❌ Station lookup error:', error);
    res.status(500).json({ 
      error: 'Station lookup failed',
      message: error.message 
    });
  }
});

// Main search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { fromCity, toCity, date, time } = req.body;
    
    if (!fromCity || !toCity || !date || !time) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromCity, toCity, date, time' 
      });
    }

    const cacheKey = createCacheKey(fromCity, toCity, date, time);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Returning cached result');
      return res.json(cached);
    }

    console.log(`🚂 New search: ${fromCity} → ${toCity} on ${date} at ${time}`);

    const results = await dbService.findRouteOptions(fromCity, toCity, date, time);

    const response = {
      results,
      searchedAt: new Date().toISOString(),
      query: { fromCity, toCity, date, time },
      fromCache: false
    };

    cache.set(cacheKey, response);
    res.json(response);

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'BesserBahn API'
  });
});

// Simple test endpoint that doesn't hit external APIs
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    mockResults: [
      {
        route: 'Direct',
        price: 89.00,
        duration: '4h 0m',
        details: 'No connections'
      },
      {
        route: 'Via Frankfurt',
        price: 67.50,
        duration: '4h 12m', 
        details: '1 connection • Save €21.50'
      }
    ]
  });
});

app.listen(port, () => {
  console.log(`🚀 BesserBahn backend running on http://localhost:${port}`);
  console.log(`📍 Test with: curl http://localhost:${port}/api/test`);
});