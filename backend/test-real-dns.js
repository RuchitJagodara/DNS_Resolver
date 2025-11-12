



const realDNS = require('./src/realDNSQuery');

async function testRealDNS() {
  console.log('=== Testing Real DNS Query Module ===\n');
  
  
  console.log('Test 1: ims.iitgn.ac.in');
  console.log('─'.repeat(60));
  
  try {
    const result = await realDNS.getRealDelegationChain('ims.iitgn.ac.in');
    
    console.log('\n📊 SUMMARY:');
    console.log(`  Total delegation stages: ${result.summary.totalStages}`);
    console.log(`  Final IP: ${result.finalIP}`);
    
    console.log('\n🔗 ACTUAL DELEGATION PATH:');
    result.summary.delegationPath.forEach((stage, idx) => {
      console.log(`  ${idx + 1}. ${stage.zone} (${stage.level})`);
      if (stage.nameservers && stage.nameservers.length > 0) {
        stage.nameservers.slice(0, 2).forEach(ns => {
          console.log(`     └─ ${ns}`);
        });
        if (stage.nameservers.length > 2) {
          console.log(`     └─ ... and ${stage.nameservers.length - 2} more`);
        }
      }
    });
    
    console.log('\n⚠️  NON-DELEGATED SUBDOMAINS:');
    if (result.summary.nonDelegatedSubdomains.length > 0) {
      result.summary.nonDelegatedSubdomains.forEach(zone => {
        console.log(`  • ${zone} (served by parent zone)`);
      });
    } else {
      console.log('  None - all levels are delegated');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  
  console.log('Test 2: www.google.com');
  console.log('─'.repeat(60));
  
  try {
    const result = await realDNS.getRealDelegationChain('www.google.com');
    
    console.log('\n📊 SUMMARY:');
    console.log(`  Total delegation stages: ${result.summary.totalStages}`);
    console.log(`  Final IP: ${result.finalIP}`);
    
    console.log('\n🔗 ACTUAL DELEGATION PATH:');
    result.summary.delegationPath.forEach((stage, idx) => {
      console.log(`  ${idx + 1}. ${stage.zone} (${stage.level})`);
      if (stage.nameservers && stage.nameservers.length > 0) {
        stage.nameservers.slice(0, 2).forEach(ns => {
          console.log(`     └─ ${ns}`);
        });
        if (stage.nameservers.length > 2) {
          console.log(`     └─ ... and ${stage.nameservers.length - 2} more`);
        }
      }
    });
    
    console.log('\n⚠️  NON-DELEGATED SUBDOMAINS:');
    if (result.summary.nonDelegatedSubdomains.length > 0) {
      result.summary.nonDelegatedSubdomains.forEach(zone => {
        console.log(`  • ${zone} (served by parent zone)`);
      });
    } else {
      console.log('  None - all levels are delegated');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  
  console.log('Test 3: Direct NS Queries');
  console.log('─'.repeat(60));
  
  try {
    const ns1 = await realDNS.getNameservers('iitgn.ac.in');
    console.log('\n🔍 Nameservers for iitgn.ac.in:');
    ns1.forEach(ns => console.log(`  • ${ns}`));
    
    const ns2 = await realDNS.getNameservers('ims.iitgn.ac.in');
    console.log('\n🔍 Nameservers for ims.iitgn.ac.in:');
    if (ns2.length === 0) {
      console.log('  ⚠️  No NS records found - not a delegated zone!');
      console.log('  → This subdomain is served by parent zone (iitgn.ac.in)');
    } else {
      ns2.forEach(ns => console.log(`  • ${ns}`));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  
  console.log('Test 4: Zone Boundaries Analysis');
  console.log('─'.repeat(60));
  
  try {
    const boundaries = await realDNS.determineZoneBoundaries('ims.iitgn.ac.in');
    
    console.log('\n📋 ALL LEVELS:');
    boundaries.boundaries.forEach(boundary => {
      const delegated = boundary.isDelegated ? '✓ DELEGATED' : '✗ NOT DELEGATED';
      console.log(`  ${boundary.zone.padEnd(20)} [${boundary.level.padEnd(13)}] ${delegated}`);
      if (boundary.note) {
        console.log(`    → ${boundary.note}`);
      }
    });
    
    console.log('\n✅ ACTUAL ZONE BOUNDARIES (where delegation occurs):');
    boundaries.actualZones.forEach(zone => {
      console.log(`  • ${zone.zone} (${zone.level})`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}


testRealDNS().catch(console.error);
