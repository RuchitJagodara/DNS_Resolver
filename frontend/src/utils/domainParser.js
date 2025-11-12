








const KNOWN_SLD_PATTERNS = {
  
  'co.uk': true, 'ac.uk': true, 'gov.uk': true, 'org.uk': true,
  'net.uk': true, 'sch.uk': true, 'police.uk': true, 'nhs.uk': true,
  
  
  'co.in': true, 'ac.in': true, 'gov.in': true, 'org.in': true,
  'edu.in': true, 'net.in': true, 'res.in': true, 'gen.in': true,
  
  
  'com.au': true, 'net.au': true, 'org.au': true, 'edu.au': true,
  'gov.au': true, 'id.au': true, 'asn.au': true,
  
  
  'co.jp': true, 'ac.jp': true, 'go.jp': true, 'or.jp': true,
  'ne.jp': true, 'gr.jp': true, 'ed.jp': true, 'lg.jp': true,
  
  
  'com.br': true, 'org.br': true, 'net.br': true, 'gov.br': true,
  'edu.br': true, 'mil.br': true,
  
  
  'com.cn': true, 'net.cn': true, 'org.cn': true, 'edu.cn': true,
  'gov.cn': true, 'ac.cn': true,
  
  
  'co.de': true,
  
  
  'co.za': true, 'org.za': true, 'net.za': true, 'gov.za': true,
  'edu.za': true, 'ac.za': true,
  
  
  'co.nz': true, 'org.nz': true, 'net.nz': true, 'govt.nz': true,
  'ac.nz': true, 'school.nz': true,
  
  
  'co.ru': true, 'org.ru': true, 'net.ru': true,
  
  
  'com.sg': true, 'edu.sg': true, 'gov.sg': true, 
  'com.my': true, 'edu.my': true, 
  'com.hk': true, 'edu.hk': true, 
};






export function parseDomain(domain) {
  
  const cleanDomain = domain.endsWith('.') ? domain.slice(0, -1) : domain;
  
  
  const parts = cleanDomain.split('.');
  
  
  const hierarchy = [
    {
      level: 0,
      name: '.',
      type: 'root',
      fullDomain: '.',
      description: 'Root Server'
    }
  ];
  
  let currentLevel = 1;
  
  
  if (parts.length >= 2) {
    const potentialSLD = parts.slice(-2).join('.');
    const tld = parts[parts.length - 1];
    
    
    hierarchy.push({
      level: currentLevel++,
      name: tld,
      type: 'tld',
      fullDomain: tld + '.',
      description: `.${tld} TLD Server`
    });
    
    
    if (KNOWN_SLD_PATTERNS[potentialSLD]) {
      const sldName = parts[parts.length - 2];
      hierarchy.push({
        level: currentLevel++,
        name: sldName,
        type: 'sld',
        fullDomain: potentialSLD + '.',
        description: `.${potentialSLD} SLD Server`
      });
      
      
      for (let i = parts.length - 3; i >= 0; i--) {
        const isHost = i === 0;
        const levelDomain = parts.slice(i).join('.');
        
        hierarchy.push({
          level: currentLevel++,
          name: parts[i],
          type: isHost ? 'authoritative' : 'intermediate',
          fullDomain: levelDomain + '.',
          description: isHost ? `Authoritative Server (${levelDomain})` : `${levelDomain} NS Server`
        });
      }
    } else {
      
      for (let i = parts.length - 2; i >= 0; i--) {
        const isHost = i === 0;
        const levelDomain = parts.slice(i).join('.');
        
        hierarchy.push({
          level: currentLevel++,
          name: parts[i],
          type: isHost ? 'authoritative' : 'intermediate',
          fullDomain: levelDomain + '.',
          description: isHost ? `Authoritative Server (${levelDomain})` : `${levelDomain} NS Server`
        });
      }
    }
  } else if (parts.length === 1) {
    
    hierarchy.push({
      level: currentLevel++,
      name: parts[0],
      type: 'authoritative',
      fullDomain: parts[0] + '.',
      description: `Authoritative Server (${parts[0]})`
    });
  }
  
  return {
    originalDomain: cleanDomain,
    hierarchy,
    depth: hierarchy.length
  };
}






export function generateServerHierarchy(domain) {
  const parsed = parseDomain(domain);
  const serverIds = ['client', 'browser_cache', 'os_cache', 'recursive_resolver'];
  
  
  parsed.hierarchy.forEach(level => {
    if (level.type === 'root') {
      serverIds.push('root');
    } else if (level.type === 'tld') {
      serverIds.push('tld');
    } else if (level.type === 'sld') {
      serverIds.push('sld');
    } else if (level.type === 'intermediate') {
      serverIds.push(`intermediate_${level.level}`);
    } else if (level.type === 'authoritative') {
      serverIds.push('authoritative');
    }
  });
  
  return serverIds;
}






export function getServerColor(type) {
  const colors = {
    client: { color: '#10b981', gradient: ['#10b981', '#059669'] },
    browser_cache: { color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
    os_cache: { color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    recursive_resolver: { color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    root: { color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
    tld: { color: '#ec4899', gradient: ['#ec4899', '#db2777'] },
    sld: { color: '#fb923c', gradient: ['#fb923c', '#f97316'] },
    intermediate: { color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    authoritative: { color: '#ef4444', gradient: ['#ef4444', '#dc2626'] }
  };
  
  return colors[type] || colors.authoritative;
}






export function getServerIcon(type) {
  const icons = {
    client: '💻',
    browser_cache: '🗄️',
    os_cache: '💾',
    recursive_resolver: '🔄',
    root: '🌍',
    tld: '🏢',
    sld: '🏛️',
    intermediate: '🔗',
    authoritative: '📋'
  };
  
  return icons[type] || '📋';
}

export default {
  parseDomain,
  generateServerHierarchy,
  getServerColor,
  getServerIcon,
  KNOWN_SLD_PATTERNS
};
