
const { parseDomain } = require('./src/domainParser');
const resolver = require('./src/dnsResolver');

async function testResolution() {
  console.log('=== Testing DNS Resolution for google.com ===\n');
  
  
  const parsed = parseDomain('google.com');
  console.log('Domain Hierarchy:');
  parsed.hierarchy.forEach((level, i) => {
    console.log(`  [${i}] type="${level.type}", name="${level.name}", fullDomain="${level.fullDomain}"`);
  });
  console.log(`\nTotal levels: ${parsed.hierarchy.length}\n`);
  
  
  try {
    const result = await resolver.resolve('google.com', 'A', 'recursive', {
      cacheEnabled: false,  
      networkLatency: 10
    });
    
    console.log('\n=== Resolution Steps ===');
    console.log(`Total steps: ${result.steps.length}\n`);
    
    result.steps.forEach((step, i) => {
      const num = (i + 1).toString().padStart(2, '0');
      console.log(`Step ${num}: ${step.stage}`);
      console.log(`         ${step.name}`);
      console.log(`         messageType: ${step.messageType || 'N/A'}`);
      console.log('');
    });
    
    console.log('=== Summary ===');
    console.log(`Success: ${result.success}`);
    console.log(`Total time: ${result.totalTime}ms`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testResolution();
