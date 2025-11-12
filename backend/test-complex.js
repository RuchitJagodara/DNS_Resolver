
const { parseDomain } = require('./src/domainParser');
const resolver = require('./src/dnsResolver');

async function testComplexDomain() {
  const domain = 'ims.iitgn.ac.in';
  console.log(`=== Testing DNS Resolution for ${domain} ===\n`);
  
  
  const parsed = parseDomain(domain);
  console.log('Domain Hierarchy:');
  parsed.hierarchy.forEach((level, i) => {
    console.log(`  [${i}] type="${level.type}", name="${level.name}", fullDomain="${level.fullDomain}"`);
  });
  console.log(`\nTotal levels: ${parsed.hierarchy.length}\n`);
  
  
  try {
    const result = await resolver.resolve(domain, 'A', 'recursive', {
      cacheEnabled: false,
      networkLatency: 10
    });
    
    console.log('\n=== Resolution Steps ===');
    console.log(`Total steps: ${result.steps.length}\n`);
    
    result.steps.forEach((step, i) => {
      const num = (i + 1).toString().padStart(2, '0');
      console.log(`Step ${num}: ${step.stage.padEnd(40)} | ${step.name}`);
    });
    
    console.log(`\n=== Summary ===`);
    console.log(`Success: ${result.success}`);
    console.log(`Total steps: ${result.steps.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testComplexDomain();
