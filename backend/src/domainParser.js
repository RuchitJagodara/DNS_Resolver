









const KNOWN_SLD_PATTERNS = {
  
  'co.uk': true, 'ac.uk': true, 'gov.uk': true, 'org.uk': true,
  'net.uk': true, 'sch.uk': true, 'nhs.uk': true, 'police.uk': true,
  
  
  'co.in': true, 'ac.in': true, 'gov.in': true, 'org.in': true,
  'net.in': true, 'edu.in': true, 'nic.in': true, 'res.in': true,
  
  
  'com.au': true, 'edu.au': true, 'gov.au': true, 'net.au': true,
  'org.au': true, 'asn.au': true, 'id.au': true,
  
  
  'co.jp': true, 'ac.jp': true, 'go.jp': true, 'or.jp': true,
  'ne.jp': true, 'gr.jp': true, 'ed.jp': true,
  
  
  'com.cn': true, 'edu.cn': true, 'gov.cn': true, 'net.cn': true,
  'org.cn': true, 'ac.cn': true,
  
  
  'com.br': true, 'edu.br': true, 'gov.br': true, 'net.br': true,
  'org.br': true,
  
  
  'co.nz': true, 'ac.nz': true, 'govt.nz': true, 'net.nz': true,
  'org.nz': true,
  
  
  'co.za': true, 'ac.za': true, 'gov.za': true, 'net.za': true,
  'org.za': true,
  
  
};






function parseDomain(domain) {
  
  const normalizedDomain = domain.replace(/\.$/, '').toLowerCase();
  
  
  const labels = normalizedDomain.split('.');
  
  if (labels.length === 0 || labels.some(label => label.length === 0)) {
    throw new Error('Invalid domain name');
  }
  
  
  const hierarchy = [];
  const levels = [];
  
  
  hierarchy.push({
    level: 0,
    name: '.',
    fullDomain: '.',
    type: 'root',
    labels: []
  });
  
  
  let sldFound = false;
  let sldIndex = -1;
  
  if (labels.length >= 2) {
    const possibleSLD = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
    if (KNOWN_SLD_PATTERNS[possibleSLD]) {
      sldFound = true;
      sldIndex = labels.length - 2;
    }
  }
  
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const currentLabels = labels.slice(i);
    const fullDomain = currentLabels.join('.') + '.';
    const level = labels.length - i;
    
    let type;
    if (i === labels.length - 1) {
      type = 'tld'; 
    } else if (sldFound && i === sldIndex) {
      type = 'sld'; 
    } else if (i === 0) {
      type = 'authoritative'; 
    } else {
      type = 'intermediate'; 
    }
    
    hierarchy.push({
      level,
      name: labels[i],
      fullDomain,
      type,
      labels: currentLabels,
      isKnownSLD: sldFound && i === sldIndex
    });
  }
  
  return {
    original: domain,
    normalized: normalizedDomain,
    labels,
    hierarchy,
    totalLevels: hierarchy.length,
    hasKnownSLD: sldFound,
    
    getDelegationChain: function() {
      return hierarchy.map(h => h.fullDomain);
    },
    
    getZoneBoundaries: function() {
      
      return hierarchy.filter(h => 
        h.type === 'root' || 
        h.type === 'tld' || 
        h.type === 'sld' || 
        h.type === 'authoritative'
      );
    }
  };
}






function generateServerHierarchy(domain) {
  const parsed = parseDomain(domain);
  const servers = [];
  
  
  servers.push({ id: 'client', type: 'client', level: -1 });
  servers.push({ id: 'browser_cache', type: 'cache', level: -1 });
  servers.push({ id: 'os_cache', type: 'cache', level: -1 });
  servers.push({ id: 'recursive_resolver', type: 'resolver', level: -1 });
  
  
  parsed.hierarchy.forEach(level => {
    if (level.type === 'root') {
      servers.push({
        id: 'root',
        type: 'nameserver',
        level: 0,
        domain: '.',
        description: 'Root DNS Server'
      });
    } else if (level.type === 'tld') {
      servers.push({
        id: 'tld',
        type: 'nameserver',
        level: 1,
        domain: level.fullDomain,
        description: `TLD Server (${level.name})`
      });
    } else if (level.type === 'sld') {
      servers.push({
        id: 'sld',
        type: 'nameserver',
        level: 2,
        domain: level.fullDomain,
        description: `SLD Server (${level.fullDomain})`
      });
    } else if (level.type === 'intermediate') {
      const serverId = `intermediate_${level.level}`;
      servers.push({
        id: serverId,
        type: 'nameserver',
        level: level.level,
        domain: level.fullDomain,
        description: `NS Server (${level.fullDomain})`
      });
    } else if (level.type === 'authoritative') {
      servers.push({
        id: 'authoritative',
        type: 'nameserver',
        level: level.level,
        domain: level.fullDomain,
        description: `Authoritative Server (${level.fullDomain})`
      });
    }
  });
  
  return servers;
}







function getServerTypeForDomain(domain, currentDomain) {
  const parsed = parseDomain(domain);
  const normalizedCurrent = currentDomain.replace(/\.$/, '').toLowerCase();
  
  const level = parsed.hierarchy.find(h => 
    h.fullDomain.replace(/\.$/, '') === normalizedCurrent
  );
  
  if (!level) return 'unknown';
  
  if (level.type === 'root') return 'root';
  if (level.type === 'tld') return 'tld';
  if (level.type === 'sld') return 'sld';
  if (level.type === 'intermediate') return `intermediate_${level.level}`;
  if (level.type === 'authoritative') return 'authoritative';
  
  return 'unknown';
}

module.exports = {
  parseDomain,
  generateServerHierarchy,
  getServerTypeForDomain,
  KNOWN_SLD_PATTERNS
};
