// Debug script to test DB API directly
const { createClient } = require('db-vendo-client');
const { profile } = require('db-vendo-client/p/db/index.js');

async function testDbApi() {
  console.log('🔧 Testing DB API directly...\n');
  
  const client = createClient(profile, 'BesserBahn-Debug');
  
  // Test 1: Try with city names (current approach)
  console.log('Test 1: City names (Berlin → München)');
  try {
    const results = await client.journeys('Berlin', 'München', {
      departure: new Date('2025-08-20T10:00'),
      results: 1
    });
    console.log('✅ Success:', results.journeys?.length || 0, 'journeys');
    if (results.journeys?.[0]) {
      console.log('   First journey:', results.journeys[0].legs?.[0]?.origin?.name, '→', results.journeys[0].legs?.slice(-1)[0]?.destination?.name);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.hafasCode) console.log('   HAFAS Code:', error.hafasCode);
  }
  
  console.log('');
  
  // Test 2: Try with station names
  console.log('Test 2: Station names (Berlin Hbf → München Hbf)');
  try {
    const results = await client.journeys('Berlin Hbf', 'München Hbf', {
      departure: new Date('2025-08-20T10:00'),
      results: 1
    });
    console.log('✅ Success:', results.journeys?.length || 0, 'journeys');
    if (results.journeys?.[0]) {
      console.log('   First journey:', results.journeys[0].legs?.[0]?.origin?.name, '→', results.journeys[0].legs?.slice(-1)[0]?.destination?.name);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.hafasCode) console.log('   HAFAS Code:', error.hafasCode);
  }
  
  console.log('');
  
  // Test 3: Try with known station IDs (from docs)
  console.log('Test 3: Station IDs (8011167 → 8000261)');
  try {
    const results = await client.journeys('8011167', '8000261', {
      departure: new Date('2025-08-20T10:00'),
      results: 1
    });
    console.log('✅ Success:', results.journeys?.length || 0, 'journeys');
    if (results.journeys?.[0]) {
      console.log('   First journey:', results.journeys[0].legs?.[0]?.origin?.name, '→', results.journeys[0].legs?.slice(-1)[0]?.destination?.name);
      console.log('   Price:', results.journeys[0].price);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.hafasCode) console.log('   HAFAS Code:', error.hafasCode);
  }
  
  console.log('');
  
  // Test 4: Try locations lookup
  console.log('Test 4: Finding station IDs');
  try {
    const berlinStations = await client.locations('Berlin Hbf', { results: 3 });
    console.log('✅ Berlin Hbf stations:');
    berlinStations.forEach((station, i) => {
      console.log(`   ${i + 1}. ${station.name} (ID: ${station.id})`);
    });
    
    const munichStations = await client.locations('München Hbf', { results: 3 });
    console.log('✅ München Hbf stations:');
    munichStations.forEach((station, i) => {
      console.log(`   ${i + 1}. ${station.name} (ID: ${station.id})`);
    });
  } catch (error) {
    console.log('❌ Station lookup failed:', error.message);
  }
}

testDbApi().catch(console.error);