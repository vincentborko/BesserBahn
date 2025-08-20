const { createClient } = require('db-vendo-client');
const { profile } = require('db-vendo-client/p/db/index.js');

class DbService {
  constructor() {
    this.client = createClient(profile, 'BesserBahn-App');
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
      console.log(`🔍 ${cityName} → ${stations[0].name} (${stations[0].id})`);
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
      
      // Convert city names to station IDs first
      const fromId = await this.getStationId(from);
      const toId = await this.getStationId(to);
      
      console.log(`🔍 Using station IDs: ${fromId} → ${toId}`);
      
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

  // FIXED: Better price extraction with proper validation
  extractPrice(journey) {
    if (!journey?.price) return null;
    
    // Based on debug output: { amount: 133.79, currency: 'EUR' }
    if (journey.price.amount !== undefined) {
      const price = Number(journey.price.amount);
      return isNaN(price) ? null : price;
    }
    
    // Fallback for other formats
    if (typeof journey.price === 'number') {
      return journey.price;
    }
    
    console.warn('⚠️ Unknown price format:', journey.price);
    return null;
  }

  // Find the cheapest journey from a list
  findCheapestJourney(journeys) {
    if (!journeys || journeys.length === 0) return null;
    
    const withPrices = journeys
      .map(journey => ({
        ...journey,
        extractedPrice: this.extractPrice(journey)
      }))
      .filter(journey => journey.extractedPrice !== null && !isNaN(journey.extractedPrice));
    
    if (withPrices.length === 0) {
      console.warn('⚠️ No journeys with valid prices found');
      return null;
    }
    
    return withPrices.sort((a, b) => a.extractedPrice - b.extractedPrice)[0];
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

  // NEW: Extract intermediate stations from a journey route
  extractIntermediateStations(directJourney, maxStations = 3) {
    if (!directJourney?.legs) return [];
    
    const intermediateStations = [];
    
    for (const leg of directJourney.legs) {
      if (leg.stopovers) {
        // Add major stops (longer stop times indicate importance)
        leg.stopovers.forEach(stop => {
          if (stop.stop?.name && stop.plannedDeparture && stop.plannedArrival) {
            const stopDuration = new Date(stop.plannedDeparture) - new Date(stop.plannedArrival);
            // Only consider stops with at least 2 minutes (indicates station, not just signal stop)
            if (stopDuration >= 120000) {
              intermediateStations.push({
                name: stop.stop.name,
                id: stop.stop.id,
                stopDuration
              });
            }
          }
        });
      }
    }
    
    // Sort by stop duration (longer stops = more important stations) and limit
    return intermediateStations
      .sort((a, b) => b.stopDuration - a.stopDuration)
      .slice(0, maxStations)
      .map(station => station.name);
  }

  // NEW: Smart route splitting using actual route data
  async findRouteOptions(fromCity, toCity, date, time) {
    const results = [];

    // 1. Get direct route first
    let directJourney = null;
    try {
      const directJourneys = await this.searchConnection(fromCity, toCity, date, time);
      directJourney = this.findCheapestJourney(directJourneys);
      
      if (directJourney) {
        results.push({
          route: 'Direct',
          price: directJourney.extractedPrice,
          duration: this.calculateDuration(directJourney.legs),
          details: 'No connections',
          connections: 0
        });
      }
    } catch (error) {
      console.error('Direct route failed:', error.message);
    }

    // 2. If we have a direct route, try splitting at intermediate stations
    if (directJourney) {
      const intermediateStations = this.extractIntermediateStations(directJourney);
      console.log(`🔍 Found ${intermediateStations.length} intermediate stations:`, intermediateStations);
      
      for (const station of intermediateStations) {
        try {
          await this.searchViaStation(fromCity, toCity, station, date, time, results);
        } catch (error) {
          console.error(`Station ${station} failed:`, error.message);
        }
      }
    }

    // Sort by price and return
    return results
      .filter(result => result.price && !isNaN(result.price))
      .sort((a, b) => a.price - b.price);
  }

  // Search via a specific intermediate station
  async searchViaStation(fromCity, toCity, viaStation, date, time, results) {
    // First leg: origin → via
    const firstLeg = await this.searchConnection(fromCity, viaStation, date, time);
    const firstBest = this.findCheapestJourney(firstLeg);
    
    if (!firstBest) return;

    // Calculate connection time
    const viaArrival = new Date(firstBest.legs[firstBest.legs.length - 1].arrival);
    viaArrival.setMinutes(viaArrival.getMinutes() + 15); // Shorter buffer for actual route stations
    
    const viaTime = viaArrival.toTimeString().slice(0, 5);
    const viaDate = viaArrival.toISOString().split('T')[0];

    // Second leg: via → destination  
    const secondLeg = await this.searchConnection(viaStation, toCity, viaDate, viaTime);
    const secondBest = this.findCheapestJourney(secondLeg);
    
    if (!secondBest) return;

    const totalPrice = firstBest.extractedPrice + secondBest.extractedPrice;
    const directPrice = results.find(r => r.route === 'Direct')?.price;
    const savings = directPrice ? directPrice - totalPrice : 0;

    // Only add if there are actual savings
    if (savings > 0) {
      results.push({
        route: `Via ${viaStation}`,
        price: totalPrice,
        duration: this.calculateTotalDuration(firstBest, secondBest),
        details: `1 connection • Save €${savings.toFixed(2)}`,
        connections: 1
      });
    }
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