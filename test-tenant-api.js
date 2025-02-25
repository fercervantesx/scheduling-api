// Simple test script to check tenant query parameter support
const axios = require('axios');
const fs = require('fs');

// Write content to see if our changes are reflected in the Docker container
fs.writeFileSync('test-marker.txt', `Test marker created at ${new Date().toISOString()}`);

async function testTenantQuery() {
  try {
    // Get demo tenant ID from seed data
    const demoTenantId = 'a2155b26-fcd8-47d0-8829-16077a78d979';
    
    // First, check what tenants are available
    console.log('Getting raw debug info first...');
    const debugResponse = await axios.get('http://localhost:3005/raw-debug');
    console.log('Debug Response:', debugResponse.data);
    
    // Test with tenant_id query parameter 
    console.log('\nTesting with tenant_id query parameter...');
    const response = await axios.get(`http://localhost:3005/health?tenant_id=${demoTenantId}`);
    
    console.log('Response:', response.data);
    console.log('Headers:', response.headers);
    
    // Also test with plain subdomain
    console.log('\nTesting with subdomain...');
    const subdomainResponse = await axios.get('http://localhost:3005/health?tenant_id=demo');
    console.log('Subdomain Response:', subdomainResponse.data);
    
    // Test with X-Tenant-ID header
    console.log('\nTesting with X-Tenant-ID header...');
    const headerResponse = await axios.get('http://localhost:3005/health', {
      headers: {
        'X-Tenant-ID': 'demo'
      }
    });
    console.log('Header Response:', headerResponse.data);
    
  } catch (error) {
    console.error('Error testing tenant API:', error.response?.data || error.message);
  }
}

testTenantQuery();