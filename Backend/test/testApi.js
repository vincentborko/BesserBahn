// Simple test script to check if everything works
const http = require('http');

console.log('🧪 Testing BesserBahn Backend...\n');

// Test 1: Health check
function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Health check: PASSED');
          resolve();
        } else {
          console.log('❌ Health check: FAILED');
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
  });
}

// Test 2: Mock endpoint
function testMock() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/test', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ Mock endpoint: PASSED');
          console.log('   Sample data:', result.mockResults[0]);
          resolve();
        } else {
          console.log('❌ Mock endpoint: FAILED');
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
  });
}

// Test 3: Real DB API search
function testRealSearch() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      fromCity: 'Berlin',
      toCity: 'München', 
      date: '2025-08-20',
      time: '10:00'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ Real search: PASSED');
          console.log(`   Found ${result.results?.length || 0} options`);
          if (result.results?.length > 0) {
            console.log('   Best option:', result.results[0]);
          }
          resolve();
        } else {
          console.log('❌ Real search: FAILED');
          console.log('   Response:', data);
          // Don't reject - this might fail due to API issues
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Real search: ERROR');
      console.log('   Error:', error.message);
      resolve(); // Don't reject - connection issues are expected during development
    });

    req.write(postData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  try {
    await testHealth();
    await testMock();
    console.log('\n🔍 Testing real DB API (this might fail if API has issues):');
    await testRealSearch();
    
    console.log('\n🎉 Testing complete!');
    console.log('\nNext steps:');
    console.log('1. If real search failed, check db-vendo-client docs');
    console.log('2. Test different city names (try "Berlin Hbf" instead of "Berlin")');
    console.log('3. Connect your iOS app to http://localhost:3000/api/search');
    
  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
    console.log('\nMake sure the server is running: npm run dev');
  }
}

runTests();