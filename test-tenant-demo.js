// Test script to verify tenant_id query parameter support
const axios = require('axios');

async function testTenantQueryParam() {
  try {
    console.log('Testing tenant_id query parameter...');
    
    // Test with tenant_id=demo (subdomain)
    console.log('\n1. Testing with tenant_id=demo (subdomain)');
    const demoResponse = await axios.get('http://localhost:3005/health?tenant_id=demo');
    console.log('Response:', JSON.stringify(demoResponse.data, null, 2));
    
    // Test with tenant_id=itinaritravel (different subdomain)
    console.log('\n2. Testing with tenant_id=itinaritravel (different subdomain)');
    const itinariResponse = await axios.get('http://localhost:3005/health?tenant_id=itinaritravel');
    console.log('Response:', JSON.stringify(itinariResponse.data, null, 2));
    
    // Test with X-Tenant-ID header
    console.log('\n3. Testing with X-Tenant-ID header');
    const headerResponse = await axios.get('http://localhost:3005/health', {
      headers: {
        'X-Tenant-ID': 'demo'
      }
    });
    console.log('Response:', JSON.stringify(headerResponse.data, null, 2));
    
    // Test default (no tenant_id or header)
    console.log('\n4. Testing default (no tenant_id or header)');
    const defaultResponse = await axios.get('http://localhost:3005/health');
    console.log('Response:', JSON.stringify(defaultResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing tenant query param:', error.response?.data || error.message);
  }
}

testTenantQueryParam();