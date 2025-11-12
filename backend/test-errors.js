const LiveDNSTracer = require('./src/liveDNSTracer');

async function test() {
  console.log('Testing Live DNS Tracer with error detection...\n');
  
  const tracer = new LiveDNSTracer();
  const result = await tracer.getTrace('google.com', 'A');
  
  console.log('=== RESULT ===');
  console.log('Success:', result.success);
  console.log('Stages:', result.stages?.length || 0);
  console.log('\n=== ERRORS ===');
  console.log('Total Issues:', result.errors?.summary?.totalIssues || 0);
  console.log('IPv6 Failures:', result.errors?.ipv6Failures?.length || 0);
  console.log('Timeouts:', result.errors?.timeouts?.length || 0);
  console.log('Comm Errors:', result.errors?.communicationErrors?.length || 0);
  
  if (result.errors?.ipv6Failures?.length > 0) {
    console.log('\n=== IPv6 FAILURE EXAMPLE ===');
    console.log(JSON.stringify(result.errors.ipv6Failures[0], null, 2));
  }
  
  if (result.errors?.timeouts?.length > 0) {
    console.log('\n=== TIMEOUT EXAMPLE ===');
    console.log(JSON.stringify(result.errors.timeouts[0], null, 2));
  }
}

test().catch(console.error);
