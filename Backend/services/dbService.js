const { createClient } = require('db-vendo-client');
const { profile } = require('db-vendo-client/p/db/index.js');

class DbService {
  constructor() {
    this.client = createClient(profile, 'BesserBahn-App');
    
    // Major German hubs for route splitting
    this.MAJOR_HUBS = [
      'Frankfurt am Main',
      'Hannover',
      'Nürnberg', 
      'Köln',
      'Hamburg'
    ];
  }

  // Search for stations by name
  async searchStations(query, maxResults = 5) {
    try {
      console.log(`🔍 Looking up stations for: "${query}"`);
      
      const stations = await this.client.locations(query, { 
        results: maxResults 
      });
      
      console.log(`✅ Found ${stations.length} stations`);
      
      return stations.map(station => ({
        id: station.id,
        name: station.name,
        type: station.type || 'station'
      }));
      
    } catch (error) {
      console.error(`❌ Station search failed for "${query}":`, error.message);
      throw error;
    }
  }

  // Convert city name to station ID
  async getStationId(cityName) {
    try {
      const stations = await this.client.locations(cityName, { results: 1 });
      if (stations.length === 0) {
        throw new Error(`No station found for: ${cityName}`);
      }
      console.log(`📍 ${cityName} → ${stations[0].name} (${stations[0].id})`);
      return stations[0].id;
    } catch (error) {
      console.error(`❌ Station lookup failed for ${cityName}:`, error.message);
      throw error;
    }
  }

  // Search for connections between two cities
  async searchConnection(from, to, date, time) {
    try {
      console.log(`🔍 Searching: ${from} → ${to} at ${date} ${time}`);
      
      // Convert city names to station IDs
      const fromId = await this.getStationId(from);
      const toId = await this.getStationId(to);
      
      // Convert to DateTime format expected by DB API
      const departureDateTime = new Date(`${date}T${time}`);
      
      const results = await this.client.journeys(fromId, toId, {
        departure: departureDateTime,
        results: 3,
        stopovers: true,
        transfers: -1
      });

      console.log(`✅ Found ${results.journeys?.length || 0} journeys`);
      return results.journeys || [];
      
    } catch (error) {
      console.error(`❌ DB API Error for ${from} → ${to}:`, error.message);
      throw error;
    }
  }

  // Find the cheapest journey from a list
  findCheapestJourney(journeys) {
    if (!journeys || journeys.length === 0) return null;
    
    const withPrices = journeys.filter(journey => 
      journey.price && journey.price.amount
    );
    
    if (withPrices.length === 0) return null;
    
    return withPrices.sort((a, b) => a.price.amount - b.price.amount)[0];
  }

  // Calculate duration from journey legs
  calculateDuration(legs) {
    if (!legs || legs.length === 0) return 'Unknown';
    
    const start = new Date(legs[0].departure);
    const end = new Date(legs[legs.length - 1].arrival);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Main method to find all route options
  async findRouteOptions(fromCity, toCity, date, time) {
    const results = [];

    // 1. Search direct route
    try {
      const directJourneys = await this.searchConnection(fromCity, toCity, date, time);
      const directBest = this.findCheapestJourney(directJourneys);
      
      if (directBest) {
        results.push({
          route: 'Direct',
          price: directBest.price.amount, // Don't divide by 100 - already in euros
          duration: this.calculateDuration(directBest.legs),
          details: 'No connections',
          connections: 0
        });
      }
    } catch (error) {
      console.error('Direct route failed:', error.message);
    }

    // 2. Search via hubs (simplified for testing - just try first 2 hubs)
    for (const hub of this.MAJOR_HUBS.slice(0, 2)) {
      try {
        await this.searchViaHub(fromCity, toCity, hub, date, time, results);
      } catch (error) {
        console.error(`Hub ${hub} failed:`, error.message);
      }
    }

    // Sort by price
    results.sort((a, b) => a.price - b.price);
    
    return results;
  }

  // Search via a specific hub
  async searchViaHub(fromCity, toCity, hubCity, date, time, results) {
    // First leg: origin → hub
    const firstLeg = await this.searchConnection(fromCity, hubCity, date, time);
    const firstBest = this.findCheapestJourney(firstLeg);
    
    if (!firstBest) return;

    // Calculate connection time at hub
    const hubArrival = new Date(firstBest.legs[firstBest.legs.length - 1].arrival);
    hubArrival.setMinutes(hubArrival.getMinutes() + 30); // 30min buffer
    
    const hubTime = hubArrival.toTimeString().slice(0, 5);
    const hubDate = hubArrival.toISOString().split('T')[0];

    // Second leg: hub → destination  
    const secondLeg = await this.searchConnection(hubCity, toCity, hubDate, hubTime);
    const secondBest = this.findCheapestJourney(secondLeg);
    
    if (!secondBest) return;

    const totalPrice = (firstBest.price.amount + secondBest.price.amount); // Don't divide by 100
    const directPrice = results.find(r => r.route === 'Direct')?.price;
    const savings = directPrice ? directPrice - totalPrice : 0;

    results.push({
      route: `Via ${hubCity}`,
      price: totalPrice,
      duration: this.calculateTotalDuration(firstBest, secondBest),
      details: `1 connection${savings > 0 ? ` • Save €${savings.toFixed(2)}` : ''}`,
      connections: 1
    });
  }

  // Calculate total duration for multi-leg journey
  calculateTotalDuration(firstJourney, secondJourney) {
    const start = new Date(firstJourney.legs[0].departure);
    const end = new Date(secondJourney.legs[secondJourney.legs.length - 1].arrival);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
}

module.exports = DbService;