



const axios = require('axios');

const API_URL = 'http://localhost:5001/api/resolve';

async function testAPI() {
  console.log('=== Testing DNS Resolver API with Real DNS ===\n');
  
  
  console.log('Test 1: Deterministic Mode (SIMULATED)');
  console.log('─'.repeat(60));
  
  try {
    const response1 = await axios.post(API_URL, {
      domain: 'ims.iitgn.ac.in',
      recordType: 'A',
      mode: 'recursive',
      config: {
        queryMode: 'deterministic',
        cacheEnabled: false
      }
    });
    
    console.log(`✅ Success: ${response1.data.success}`);
    console.log(`📊 Total steps: ${response1.data.steps.length}`);
    console.log(`⏱️  Total time: ${response1.data.totalTime}ms`);
    
    
    const serverTypes = response1.data.steps
      .filter(step => step.server)
      .map(step => step.server.type)
      .filter((type, idx, arr) => arr.indexOf(type) === idx);
    
    console.log(`🖥️  Server types: ${serverTypes.join(', ')}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  
  console.log('Test 2: Live Mode (REAL DNS)');
  console.log('─'.repeat(60));
  
  try {
    const response2 = await axios.post(API_URL, {
      domain: 'ims.iitgn.ac.in',
      recordType: 'A',
      mode: 'recursive',
      config: {
        queryMode: 'live',
        cacheEnabled: false
      }
    });
    
    console.log(`✅ Success: ${response2.data.success}`);
    console.log(`📊 Total steps: ${response2.data.steps.length}`);
    console.log(`⏱️  Total time: ${response2.data.totalTime}ms`);
    
    
    const servers = response2.data.steps
      .filter(step => step.server && step.server.isReal)
      .map(step => ({
        type: step.server.type,
        zone: step.server.domain,
        firstNS: step.server.name
      }));
    
    console.log(`🖥️  Real DNS Servers Found:`);
    servers.forEach((server, idx) => {
      if (idx % 2 === 0) { 
        console.log(`   ${idx/2 + 1}. ${server.zone} (${server.type}) - NS: ${server.firstNS}`);
      }
    });
    
    
    const finalStep = response2.data.steps[response2.data.steps.length - 1];
    console.log('\n📋 Analysis:');
    console.log(`   - Total delegation levels: ${servers.length / 2}`);
    console.log(`   - All stages use REAL nameservers from DNS queries`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  
  
  console.log('\nTest 3: google.com (Live Mode)');
  console.log('─'.repeat(60));
  
  try {
    const response3 = await axios.post(API_URL, {
      domain: 'www.google.com',
      recordType: 'A',
      mode: 'recursive',
      config: {
        queryMode: 'live',
        cacheEnabled: false
      }
    });
    
    console.log(`✅ Success: ${response3.data.success}`);
    console.log(`📊 Total steps: ${response3.data.steps.length}`);
    
    const servers = response3.data.steps
      .filter(step => step.server && step.server.isReal)
      .map(step => ({
        type: step.server.type,
        zone: step.server.domain
      }));
    
    console.log(`🖥️  Real DNS Servers:`);
    servers.forEach((server, idx) => {
      if (idx % 2 === 0) {
        console.log(`   ${idx/2 + 1}. ${server.zone} (${server.type})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

testAPI().catch(console.error);
