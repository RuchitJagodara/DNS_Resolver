const LiveDNSTracer = require('./src/liveDNSTracer');

async function test() {
  const tracer = new LiveDNSTracer();
  
  console.log('Testing Live DNS Tracer with dig +trace...\n');
  
  const result = await tracer.getTrace('google.com', 'A');
  
  if (!result.success) {
    console.error('Error:', result.error);
    return;
  }
  
  console.log(`\n=== TRACE RESULT ===`);
  console.log(`Domain: ${result.domain}`);
  console.log(`Record Type: ${result.recordType}`);
  console.log(`Total Time: ${result.totalTime}ms`);
  console.log(`Total Stages: ${result.totalStages}`);
  console.log(`Timestamp: ${result.timestamp}`);
  
  console.log(`\n=== PARSED STAGES ===`);
  result.stages.forEach((stage, i) => {
    console.log(`\nStage ${i + 1}: ${stage.type.toUpperCase()}`);
    console.log(`  Zone: ${stage.zone}`);
    if (stage.nameservers) {
      console.log(`  Nameservers: ${stage.nameservers.slice(0, 3).join(', ')}${stage.nameservers.length > 3 ? '...' : ''}`);
    }
    if (stage.answer) {
      console.log(`  Answer: ${stage.answer}`);
    }
    console.log(`  TTL: ${stage.ttl}`);
    console.log(`  Response Time: ${stage.responseTime}ms`);
    console.log(`  Received From: ${stage.receivedFrom} (${stage.serverIP})`);
    console.log(`  Bytes: ${stage.receivedBytes}`);
    if (stage.dnssec && stage.dnssec.length > 0) {
      console.log(`  DNSSEC: ${stage.dnssec.length} records`);
    }
  });
  
  console.log(`\n=== VISUALIZATION STAGES ===`);
  result.visualStages.forEach(stage => {
    console.log(`\nStep ${stage.step}: ${stage.name}`);
    console.log(`  Type: ${stage.messageType} (${stage.direction})`);
    console.log(`  Timing: ${stage.timing}ms`);
    if (stage.receivedBytes) {
      console.log(`  Bytes: ${stage.receivedBytes}`);
    }
  });
}

test().catch(console.error);
