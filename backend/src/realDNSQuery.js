






const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);






async function getNameservers(domain) {
  const startTime = Date.now();
  try {
    const nameservers = await dns.resolveNs(domain);
    const queryTime = Date.now() - startTime;
    return { nameservers, queryTime };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    return { nameservers: [], queryTime };
  }
}






async function getARecords(domain) {
  const startTime = Date.now();
  try {
    const addresses = await dns.resolve4(domain);
    const queryTime = Date.now() - startTime;
    return { addresses, queryTime };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    return { addresses: [], queryTime };
  }
}






function parseDigTrace(output) {
  const stages = [];
  const lines = output.split('\n');
  
  let currentStage = null;
  
  for (const line of lines) {
    
    if (line.startsWith(';') || !line.trim()) {
      
      if (line.includes('Received') && line.includes('from') && currentStage) {
        const match = line.match(/from\s+([^#]+)#/);
        if (match) {
          currentStage.respondingServer = match[1].trim();
        }
      }
      continue;
    }
    
    
    if (line.includes('\tNS\t')) {
      const parts = line.split(/\s+/);
      const domain = parts[0];
      const nameserver = parts[parts.length - 1];
      
      if (!currentStage || currentStage.domain !== domain) {
        
        currentStage = {
          domain: domain,
          nameservers: [nameserver],
          type: domain === '.' ? 'root' : 
                domain.split('.').length === 2 ? 'tld' : 
                'authoritative'
        };
        stages.push(currentStage);
      } else {
        
        currentStage.nameservers.push(nameserver);
      }
    }
    
    
    if (line.includes('\tA\t')) {
      const parts = line.split(/\s+/);
      const domain = parts[0];
      const ip = parts[parts.length - 1];
      
      stages.push({
        domain: domain,
        ip: ip,
        type: 'answer',
        isFinalAnswer: true
      });
    }
  }
  
  return stages;
}






async function traceDNS(domain) {
  try {
    const { stdout, stderr } = await execPromise(`dig +trace ${domain} 2>&1`);
    
    
    if (stderr && stderr.includes('command not found')) {
      throw new Error('dig command not available');
    }
    
    const stages = parseDigTrace(stdout);
    
    
    const delegationChain = {
      domain: domain,
      stages: stages,
      delegationLevels: stages.filter(s => s.type !== 'answer').length,
      hasRealDelegation: stages.length > 0
    };
    
    return delegationChain;
  } catch (error) {
    console.error(`Error tracing DNS for ${domain}:`, error.message);
    return null;
  }
}






async function determineZoneBoundaries(domain) {
  const parts = domain.split('.').reverse(); 
  const zoneBoundaries = [];
  const queryTimes = []; 
  
  
  zoneBoundaries.push({
    zone: '.',
    level: 'root',
    hasNS: true
  });
  
  
  let currentDomain = '';
  for (let i = 0; i < parts.length; i++) {
    currentDomain = i === 0 ? parts[i] : `${parts[i]}.${currentDomain}`;
    
    const { nameservers, queryTime } = await getNameservers(currentDomain);
    queryTimes.push({ domain: currentDomain, queryTime });
    const hasNS = nameservers.length > 0;
    
    let level = 'authoritative';
    if (i === 0) level = 'tld';
    else if (i === 1 && parts[0] === 'in' && currentDomain.endsWith('.in')) {
      
      level = 'sld';
    }
    
    zoneBoundaries.push({
      zone: currentDomain,
      level: level,
      hasNS: hasNS,
      nameservers: nameservers,
      isDelegated: hasNS,
      queryTime: queryTime 
    });
    
    
    if (!hasNS && i !== parts.length - 1) {
      zoneBoundaries[zoneBoundaries.length - 1].note = 'No delegation - served by parent zone';
    }
  }
  
  return {
    domain: domain,
    boundaries: zoneBoundaries,
    actualZones: zoneBoundaries.filter(b => b.isDelegated),
    nonDelegatedLevels: zoneBoundaries.filter(b => !b.isDelegated),
    queryTimes: queryTimes 
  };
}







async function getRealDelegationChain(domain) {
  const startTime = Date.now();
  
  const [traceResult, boundariesResult, aRecordsResult] = await Promise.all([
    traceDNS(domain),
    determineZoneBoundaries(domain),
    getARecords(domain)
  ]);
  
  const totalTime = Date.now() - startTime;
  
  return {
    domain: domain,
    traceResult: traceResult,
    zoneBoundaries: boundariesResult,
    finalIP: aRecordsResult.addresses.length > 0 ? aRecordsResult.addresses[0] : null,
    allIPs: aRecordsResult.addresses,
    aRecordQueryTime: aRecordsResult.queryTime, 
    totalQueryTime: totalTime, 
    timestamp: new Date().toISOString(),
    
    
    summary: {
      totalStages: traceResult?.stages?.length || boundariesResult.actualZones.length,
      actualDelegationLevels: boundariesResult.actualZones.map(z => z.zone),
      nonDelegatedSubdomains: boundariesResult.nonDelegatedLevels.map(z => z.zone),
      delegationPath: boundariesResult.actualZones.map(z => ({
        zone: z.zone,
        level: z.level,
        nameservers: z.nameservers,
        queryTime: z.queryTime 
      })),
      
      timingBreakdown: {
        nsQueries: boundariesResult.queryTimes,
        aRecordQuery: aRecordsResult.queryTime,
        totalTime: totalTime
      }
    }
  };
}







async function compareRealVsSimulated(domain, simulatedStages) {
  const realDNS = await getRealDelegationChain(domain);
  
  const comparison = {
    domain: domain,
    real: realDNS.summary,
    simulated: {
      totalStages: simulatedStages.length,
      levels: simulatedStages.map(s => s.level || s.name)
    },
    differences: [],
    isAccurate: true
  };
  
  
  const realLevels = new Set(realDNS.summary.actualDelegationLevels);
  const simulatedLevels = simulatedStages.map(s => s.level || s.name);
  
  for (const simLevel of simulatedLevels) {
    if (!realLevels.has(simLevel) && simLevel !== 'recursive') {
      comparison.differences.push({
        type: 'fictional_server',
        level: simLevel,
        message: `Simulated server for "${simLevel}" does not exist in real DNS`
      });
      comparison.isAccurate = false;
    }
  }
  
  
  for (const realZone of realDNS.zoneBoundaries.actualZones) {
    const found = simulatedLevels.some(l => l.includes(realZone.zone.replace(/\.$/, '')));
    if (!found && realZone.zone !== '.') {
      comparison.differences.push({
        type: 'missing_delegation',
        zone: realZone.zone,
        message: `Real delegation for "${realZone.zone}" not shown in simulation`
      });
    }
  }
  
  return comparison;
}

module.exports = {
  getNameservers,
  getARecords,
  traceDNS,
  determineZoneBoundaries,
  getRealDelegationChain,
  compareRealVsSimulated
};
