const dns = require('dns').promises;
const dnsPacket = require('dns-packet');
const NodeCache = require('node-cache');
const dgram = require('dgram');
const { parseDomain, getServerTypeForDomain } = require('./domainParser');
const realDNS = require('./realDNSQuery');


const browserCache = new NodeCache({ stdTTL: 300 });
const osCache = new NodeCache({ stdTTL: 600 });
const resolverCache = new NodeCache({ stdTTL: 3600 });


const DNS_SERVERS = {
  root: [
    { name: 'a.root-servers.net', ip: '198.41.0.4', description: 'Root Server A' },
    { name: 'm.root-servers.net', ip: '202.12.27.33', description: 'Root Server M' }
  ],
  recursive: [
    { name: 'Google DNS', ip: '8.8.8.8', description: 'Google Public DNS' },
    { name: 'Cloudflare DNS', ip: '1.1.1.1', description: 'Cloudflare DNS' }
  ]
};


const RECORD_TYPES = {
  'A': 1,
  'AAAA': 28,
  'CNAME': 5,
  'MX': 15,
  'NS': 2,
  'TXT': 16,
  'SOA': 6,
  'PTR': 12
};

class DNSResolver {
  constructor() {
    this.steps = [];
    this.totalTime = 0;
    this.retryAttempts = {};
    this.finalCachedResult = null; 
  }

  async resolve(domain, recordType = 'A', mode = 'recursive', config = {}) {
    this.steps = [];
    this.totalTime = 0;
    this.retryAttempts = {};
    this.finalCachedResult = null;
    const startTime = Date.now();

    const settings = {
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 300,
      networkLatency: config.networkLatency || 50,
      packetLoss: config.packetLoss || 0,
      maxRetries: config.maxRetries || 3,
      dnssecEnabled: config.dnssecEnabled || false,
      customDNS: config.customDNS || null,
      simulateFailures: config.simulateFailures || false,
      queryMode: config.queryMode || 'deterministic',
      useRealDNS: config.queryMode === 'real-simulation' || config.useRealDelegation 
    };

    try {
      
      await this.checkBrowserCache(domain, recordType, settings);

      
      await this.checkOSCache(domain, recordType, settings);

      
      if (mode === 'recursive') {
        await this.recursiveResolution(domain, recordType, settings);
      } else {
        await this.iterativeResolution(domain, recordType, settings);
      }

      this.totalTime = Date.now() - startTime;

      return {
        success: true,
        domain,
        recordType,
        mode,
        steps: this.steps,
        totalTime: this.totalTime,
        config: settings
      };
    } catch (error) {
      this.totalTime = Date.now() - startTime;
      
      if (error.message === 'CACHE_HIT' && this.finalCachedResult) {
        return {
          success: true,
          domain,
          recordType,
          mode,
          steps: this.steps,
          totalTime: this.totalTime,
          config: settings,
          cached: true,
          records: this.finalCachedResult.records,
          ttl: this.finalCachedResult.ttl,
          cacheSource: this.finalCachedResult.source
        };
      }
      return {
        success: false,
        domain,
        recordType,
        mode,
        error: error.message,
        steps: this.steps,
        totalTime: this.totalTime,
        config: settings
      };
    }
  }

  async checkBrowserCache(domain, recordType, settings) {
    const stepStart = Date.now();
    await this.simulateLatency(10);

    const cacheKey = `${domain}:${recordType}`;
    const cached = settings.cacheEnabled ? browserCache.get(cacheKey) : null;

    
    this.steps.push({
      stage: 'browser_cache_query',
      name: 'Browser Cache Query',
      description: 'Querying the browser\'s local cache for DNS record',
      server: { name: 'Browser Cache', type: 'cache' },
      messageType: 'QUERY',
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, null),
      explanation: 'Checking browser cache for cached DNS record.'
    });

    
    this.steps.push({
      stage: 'browser_cache_response',
      name: cached ? 'Browser Cache Hit' : 'Browser Cache Miss',
      description: cached ? 'DNS record found in browser cache' : 'DNS record not found in browser cache',
      server: { name: 'Browser Cache', type: 'cache' },
      messageType: 'RESPONSE',
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      response: cached ? {
        found: true,
        records: cached.records,
        ttl: cached.ttl,
        cached: true
      } : {
        found: false,
        cacheMiss: true,
        message: 'Cache miss - record not found in browser cache'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, cached),
      explanation: cached 
        ? 'Cache hit! The browser has a cached copy of this DNS record, avoiding network queries.'
        : 'Cache miss. The browser doesn\'t have this record cached, proceeding to OS cache.'
    });

    if (cached) {
      
      this.finalCachedResult = {
        source: 'Browser Cache',
        records: cached.records,
        ttl: cached.ttl
      };
      throw new Error('CACHE_HIT'); 
    }
  }

  async checkOSCache(domain, recordType, settings) {
    const stepStart = Date.now();
    await this.simulateLatency(20);

    const cacheKey = `${domain}:${recordType}`;
    const cached = settings.cacheEnabled ? osCache.get(cacheKey) : null;

    
    this.steps.push({
      stage: 'os_cache_query',
      name: 'OS Cache Query',
      description: 'Querying the OS-level DNS cache (resolver cache)',
      server: { name: 'OS Resolver Cache', type: 'cache' },
      messageType: 'QUERY',
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, null),
      explanation: 'Checking OS cache for cached DNS record.'
    });

    
    this.steps.push({
      stage: 'os_cache_response',
      name: cached ? 'OS Cache Hit' : 'OS Cache Miss',
      description: cached ? 'DNS record found in OS cache' : 'DNS record not found in OS cache',
      server: { name: 'OS Resolver Cache', type: 'cache' },
      messageType: 'RESPONSE',
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      response: cached ? {
        found: true,
        records: cached.records,
        ttl: cached.ttl,
        cached: true
      } : {
        found: false,
        cacheMiss: true,
        message: 'Cache miss - record not found in OS cache'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, cached),
      explanation: cached
        ? 'Cache hit at OS level! The operating system has cached this DNS record.'
        : 'Cache miss. The OS doesn\'t have this record cached, proceeding to DNS servers.'
    });

    if (cached) {
      this.finalCachedResult = {
        source: 'OS Resolver Cache',
        records: cached.records,
        ttl: cached.ttl
      };
      throw new Error('CACHE_HIT');
    }
  }

  async simulatePacketLossWithRetry(stageName, sourceServer, targetServer, settings, queryInfo) {
    const maxRetries = settings.maxRetries || 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;
      const attemptStart = Date.now();

      
      const packetLost = Math.random() < (settings.packetLoss / 100);

      if (packetLost && attempt < maxRetries) {
        
        const lossPoint = 0.3 + Math.random() * 0.4; 

        this.steps.push({
          stage: 'packet_loss',
          name: `Packet Loss - Attempt ${attempt}`,
          description: `Network packet was lost during transmission to ${targetServer.name}`,
          server: targetServer,
          query: queryInfo,
          timing: Date.now() - attemptStart,
          packetLoss: {
            occurred: true,
            lossPoint: lossPoint,
            attempt: attempt,
            maxRetries: maxRetries
          },
          latency: settings.networkLatency,
          explanation: `Packet was lost at ${Math.round(lossPoint * 100)}% of the journey. Implementing exponential backoff retry strategy.`
        });

        
        const backoffDelay = Math.pow(2, attempt - 1) * 1000;
        await this.simulateLatency(backoffDelay);
      } else {
        
        success = true;
        if (attempt > 1) {
          this.steps.push({
            stage: 'packet_retry_success',
            name: `Retry Successful - Attempt ${attempt}`,
            description: `Packet successfully delivered after ${attempt - 1} failed attempt(s)`,
            server: targetServer,
            query: queryInfo,
            timing: Date.now() - attemptStart,
            packetLoss: {
              occurred: false,
              attempt: attempt,
              maxRetries: maxRetries,
              retriesNeeded: attempt - 1
            },
            latency: settings.networkLatency,
            explanation: `After ${attempt - 1} failed attempt(s), the packet was successfully delivered using exponential backoff retry strategy.`
          });
        }
      }
    }

    if (!success) {
      
      this.steps.push({
        stage: 'packet_loss_fatal',
        name: 'All Retries Exhausted',
        description: `Failed to deliver packet after ${maxRetries} attempts`,
        server: targetServer,
        query: queryInfo,
        timing: Date.now() - attemptStart,
        packetLoss: {
          occurred: true,
          attempt: maxRetries,
          maxRetries: maxRetries,
          fatal: true
        },
        explanation: `All ${maxRetries} retry attempts failed. In real scenarios, this would result in a DNS resolution timeout error.`
      });
      throw new Error('PACKET_LOSS_FATAL');
    }

    return success;
  }

  async recursiveResolution(domain, recordType, settings) {
    const stepStart = Date.now();
    const queryTimestamp = Date.now(); 
    
    await this.simulateLatency(settings.networkLatency);

    
    const _resolverBase = settings.customDNS || DNS_SERVERS.recursive[0];
    const resolver = typeof _resolverBase === 'string'
      ? { name: _resolverBase, ip: _resolverBase, description: 'Custom Recursive Resolver', type: 'resolver' }
      : { ..._resolverBase, type: _resolverBase.type || 'resolver' };

    
    if (settings.packetLoss > 0) {
      try {
        await this.simulatePacketLossWithRetry(
          'recursive_resolver',
          { name: 'Client', type: 'client' },
          resolver,
          settings,
          { domain, type: recordType, class: 'IN', recursionDesired: true }
        );
      } catch (error) {
        if (error.message === 'PACKET_LOSS_FATAL') {
          throw error;
        }
      }
    }
    
    const responseTimestamp = Date.now(); 
    const rtt = responseTimestamp - queryTimestamp; 
    
    this.steps.push({
      stage: 'client_to_recursive_query',
      name: '🔄 Client → Recursive Resolver',
      description: `Client sends query to recursive DNS resolver (${resolver.name})`,
      server: resolver,
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: true
      },
      timing: Date.now() - stepStart,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, true),
      explanation: `Client asks recursive resolver: "Please find the ${recordType} record for ${domain}" with RD (Recursion Desired) = 1. The recursive resolver will handle all the work of querying root, TLD, and authoritative servers.`
    });

    
    
    const result = await this.simulateRecursiveResolverWork(domain, recordType, settings);

  
  const hasRecords = result.records && result.records.length > 0;
  const querySucceeded = hasRecords; 
  const isSimulated = result.records && result.records.some(r => r.simulated);

    const responseTime = Date.now() - stepStart;
    this.steps.push({
      stage: 'recursive_to_client_response',
      name: '⬅️ Recursive Resolver → Client',
      description: querySucceeded
        ? 'Recursive resolver returns final answer to client'
        : 'Recursive resolver returns error to client',
      server: resolver,
      response: {
        found: querySucceeded,
        records: querySucceeded ? result.records : [],
        ttl: result.ttl,
        rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
        authoritative: false,
        recursionAvailable: true,
        simulated: isSimulated || undefined,
        error: !querySucceeded ? 'DNS resolution failed' : undefined
      },
      timing: responseTime,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateResponsePacket(domain, recordType, result),
      explanation: querySucceeded
        ? (isSimulated
            ? `⚠️ Recursive resolver returns a simulated fallback answer for ${domain} (actual DNS query failed). Educational simulated record provided; TTL = ${result.ttl} seconds.`
            : `✅ The recursive resolver successfully resolved ${domain} and returns the answer to the client. The resolver did all the work (queried root, TLD, and authoritative servers), and the client receives the final answer with RA (Recursion Available) = 1. This response will be cached for ${result.ttl} seconds.`)
        : `❌ The recursive resolver could not resolve ${domain}. After querying root → TLD → authoritative servers, the final result is NXDOMAIN (domain does not exist).`
    });

    
    if (settings.cacheEnabled) {
      const cacheKey = `${domain}:${recordType}`;
      browserCache.set(cacheKey, result, result.ttl);
      osCache.set(cacheKey, result, result.ttl);
    }
  }

  







  async generateDelegationStagesFromRealDNS(domain, recordType, settings) {
    console.log(`[BACKEND] Generating LIVE delegation stages for ${domain} using real DNS`);
    
    const delegationStages = [];
    
    try {
      
      const realDNSData = await realDNS.getRealDelegationChain(domain);
      
      console.log(`[BACKEND] Real DNS delegation levels:`, realDNSData.summary.actualDelegationLevels);
      console.log(`[BACKEND] Non-delegated subdomains:`, realDNSData.summary.nonDelegatedSubdomains);
      console.log(`[BACKEND] Query timing breakdown:`, realDNSData.summary.timingBreakdown);
      
      
      const actualZones = realDNSData.zoneBoundaries.actualZones;
      
      for (let i = 0; i < actualZones.length; i++) {
        const zone = actualZones[i];
        const nextZone = i < actualZones.length - 1 ? actualZones[i + 1] : null;
        const isLast = !nextZone;
        
        
        const realQueryTime = zone.queryTime || 1; 
        
        
        const firstNS = zone.nameservers && zone.nameservers.length > 0 
          ? zone.nameservers[0] 
          : `ns.${zone.zone}`;
        
        const serverInfo = {
          name: firstNS,
          ip: '0.0.0.0', 
          type: zone.level,
          domain: zone.zone,
          description: `${zone.level} Server`,
          isReal: true,
          allNameservers: zone.nameservers || [],
          realQueryTime: realQueryTime 
        };
        
        
        let displayName;
        if (zone.level === 'root') {
          displayName = 'Root Server';
        } else if (zone.level === 'tld') {
          displayName = `.${zone.zone} TLD Server`;
        } else if (zone.level === 'sld') {
          displayName = `.${zone.zone} SLD Server`;
        } else {
          displayName = `Authoritative Server (${zone.zone})`;
        }
        
        const queryStage = `recursive_to_${zone.level}_query`;
        const responseStage = `${zone.level}_to_recursive_response`;
        
        
        delegationStages.push({
          stage: queryStage,
          name: `🔄 Recursive Resolver → ${displayName}`,
          description: isLast
            ? `Recursive resolver queries authoritative server for ${domain} information`
            : `Recursive resolver queries ${displayName} for delegation to ${nextZone.zone}`,
          server: serverInfo,
          query: { domain: isLast ? domain : nextZone.zone, type: recordType, class: 'IN' },
          timing: realQueryTime, 
          messageType: 'QUERY',
          direction: 'request',
          isRealTiming: true, 
          explanation: isLast
            ? `Recursive resolver asks authoritative server: "What is the ${recordType} record for ${domain}?"`
            : `Recursive resolver asks ${zone.level} server: "Where can I find the nameservers for ${nextZone.zone}?"`
        });
        
        
        
        let response;
        if (isLast) {
          
          response = {
            answer: realDNSData.finalIP 
              ? [{ name: domain, type: recordType, class: 'IN', ttl: 300, data: realDNSData.finalIP }]
              : [],
            authority: [],
            additional: []
          };
        } else {
          
          response = {
            answer: [],
            authority: nextZone.nameservers.map(ns => ({
              name: nextZone.zone,
              type: 'NS',
              class: 'IN',
              ttl: 172800,
              data: ns
            })),
            additional: []
          };
        }
        
        delegationStages.push({
          stage: responseStage,
          name: `✅ ${displayName} → Recursive Resolver`,
          description: isLast
            ? `Authoritative server returns the ${recordType} record for ${domain}`
            : `${displayName} provides nameserver delegation for ${nextZone.zone}`,
          server: serverInfo,
          response: response,
          timing: realQueryTime, 
          messageType: 'RESPONSE',
          direction: 'response',
          isRealTiming: true, 
          explanation: isLast
            ? `Authoritative server responds: "${domain} has ${recordType} record: ${realDNSData.finalIP}"`
            : `${zone.level} server responds: "For ${nextZone.zone}, contact nameservers: ${nextZone.nameservers.slice(0, 2).join(', ')}${nextZone.nameservers.length > 2 ? '...' : ''}"`
        });
      }
      
      
      const nonDelegated = realDNSData.summary.nonDelegatedSubdomains.filter(s => s !== '.');
      if (nonDelegated.length > 0) {
        console.log(`[BACKEND] Note: ${nonDelegated.join(', ')} are NOT separate zones - served by parent zone`);
      }
      
      const finalResult = {
        domain: domain,
        type: recordType,
        answer: realDNSData.finalIP || null,
        allAnswers: realDNSData.allIPs || [],
        ttl: 300,
        authoritative: true,
        cached: false,
        isRealDNS: true,
        nonDelegatedLevels: nonDelegated,
        
        timingData: {
          totalQueryTime: realDNSData.totalQueryTime,
          aRecordQueryTime: realDNSData.aRecordQueryTime,
          nsQueryTimes: realDNSData.summary.timingBreakdown.nsQueries,
          timestamp: realDNSData.timestamp
        }
      };
      
      console.log(`[BACKEND] Generated ${delegationStages.length} stages from real DNS data`);
      console.log(`[BACKEND] Total query time: ${realDNSData.totalQueryTime}ms`);
      return { delegationStages, result: finalResult };
      
    } catch (error) {
      console.error(`[BACKEND] Error getting real DNS data:`, error.message);
      console.log(`[BACKEND] Falling back to simulated delegation stages`);
      
      return this.generateDelegationStages(domain, recordType, settings);
    }
  }

  






  async generateDelegationStages(domain, recordType, settings) {
    const parsed = parseDomain(domain);
    console.log(`[BACKEND] Generating delegation stages for ${domain}`);
    console.log(`[BACKEND] Parsed hierarchy levels:`, parsed.hierarchy.map(h => `${h.type}:${h.fullDomain}`));
    const delegationStages = [];

    
    for (let i = 0; i < parsed.hierarchy.length; i++) {
      const level = parsed.hierarchy[i];
      const isLast = i === parsed.hierarchy.length - 1;
      const isRoot = level.type === 'root';
      const nextLevel = i < parsed.hierarchy.length - 1 ? parsed.hierarchy[i + 1] : null;

      
      const serverInfo = {
        name: isRoot ? 'a.root-servers.net' : `ns.${level.fullDomain}`,
        ip: isRoot ? '198.41.0.4' : `192.168.${i}.1`,
        type: level.type,
        domain: level.fullDomain,
        description: level.description || `${level.type} Server`
      };

      
      const queryStage = `recursive_to_${level.type === 'intermediate' ? level.type + '_' + i : level.type}_query`;
      const responseStage = `${level.type === 'intermediate' ? level.type + '_' + i : level.type}_to_recursive_response`;

      
      let displayName;
      if (level.type === 'root') {
        displayName = 'Root Server';
      } else if (level.type === 'tld') {
        displayName = `.${level.name} TLD Server`;
      } else if (level.type === 'sld') {
        displayName = `.${level.fullDomain.slice(0, -1)} SLD Server`;
      } else if (level.type === 'authoritative') {
        displayName = `Authoritative Server`;
      } else {
        displayName = `${level.fullDomain.slice(0, -1)} NS Server`;
      }

      
      await this.simulateLatency(settings.networkLatency);
      delegationStages.push({
        stage: queryStage,
        name: `🔄 Recursive Resolver → ${displayName}`,
        description: isRoot 
          ? `Recursive resolver queries root server for TLD information`
          : `Recursive resolver queries ${displayName} for ${nextLevel ? nextLevel.fullDomain : domain} information`,
        server: serverInfo,
        query: { domain, type: recordType, class: 'IN' },
        timing: settings.networkLatency,
        messageType: 'QUERY',
        direction: 'request',
        explanation: isRoot
          ? `Recursive resolver asks root server: "Where can I find information about .${parsed.hierarchy[1]?.name} domains?"`
          : isLast
            ? `Recursive resolver asks authoritative server: "What is the ${recordType} record for ${domain}?"`
            : `Recursive resolver asks ${level.type} server: "Where can I find the nameservers for ${nextLevel.fullDomain}?"`
      });

      
      await this.simulateLatency(settings.networkLatency);

      if (isLast) {
        
        const result = await this.performActualDNSQuery(domain, recordType);
  const isSimulated = result.records && result.records.some(r => r.simulated);
  const querySucceeded = result.records && result.records.length > 0; 

        delegationStages.push({
          stage: responseStage,
          name: `⬅️ ${displayName} → Recursive Resolver`,
          description: querySucceeded
            ? `${displayName} provides final answer`
            : `${displayName} returns error`,
          server: serverInfo,
          response: {
            found: querySucceeded,
            records: querySucceeded ? result.records : [],
            ttl: result.ttl,
            rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
            authoritative: true,
            recursionAvailable: false,
            simulated: isSimulated || undefined
          },
          timing: settings.networkLatency,
          messageType: 'RESPONSE',
          direction: 'response',
          packet: this.generateResponsePacket(domain, recordType, result),
          explanation: querySucceeded
            ? (isSimulated
                ? `⚠️ Authoritative server provides a simulated fallback answer (actual DNS query failed). ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}.`
                : `✅ Authoritative server responds with the answer: ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}. This is the FINAL ANSWER with AA (Authoritative Answer) flag set. TTL = ${result.ttl} seconds.`)
            : `❌ Authoritative server responds: Domain ${domain} does not exist (NXDOMAIN).`
        });

        return { delegationStages, result };
      } else {
        
        const referralTarget = nextLevel.fullDomain;
        const nextDisplayName = nextLevel.type === 'tld' ? `.${nextLevel.name} TLD Server` 
          : nextLevel.type === 'sld' ? `.${nextLevel.fullDomain.slice(0, -1)} SLD Server`
          : nextLevel.type === 'authoritative' ? 'Authoritative Server'
          : `${nextLevel.fullDomain.slice(0, -1)} NS Server`;
        
        delegationStages.push({
          stage: responseStage,
          name: `⬅️ ${displayName} → Recursive Resolver`,
          description: `${displayName} responds with referral to ${nextDisplayName}`,
          server: serverInfo,
          response: {
            found: false,
            referral: true,
            nameservers: [`ns1.${referralTarget}`, `ns2.${referralTarget}`],
            glueRecords: [
              { name: `ns1.${referralTarget}`, ip: `192.168.${i + 1}.1` },
              { name: `ns2.${referralTarget}`, ip: `192.168.${i + 1}.2` }
            ],
            rcode: 'NOERROR',
            authoritative: false
          },
          timing: settings.networkLatency,
          messageType: 'RESPONSE',
          direction: 'response',
          explanation: isRoot
            ? `Root server responds: "I don't have the answer, but the .${nextLevel.name} TLD nameservers do. Here are their addresses (glue records): ns1.${referralTarget} = 192.168.${i + 1}.1"`
            : `${level.type} server responds: "The nameservers for ${referralTarget} are ns1.${referralTarget} and ns2.${referralTarget}. Here are their IP addresses (glue records)."`
        });
      }
    }

    console.log(`[BACKEND] Generated ${delegationStages.length} delegation stages`);
    console.log(`[BACKEND] Stage names:`, delegationStages.map(s => s.stage));
    return { delegationStages, result: null };
  }

  async simulateRecursiveResolverWork(domain, recordType, settings) {
    
    
    
    
    const useRealDNS = settings.useRealDNS || settings.mode === 'live';
    
    let delegationStages, finalResult;
    
    if (useRealDNS) {
      console.log(`[BACKEND] Using REAL DNS queries for ${domain}`);
      ({ delegationStages, result: finalResult } = await this.generateDelegationStagesFromRealDNS(domain, recordType, settings));
    } else {
      console.log(`[BACKEND] Using SIMULATED DNS for ${domain}`);
      ({ delegationStages, result: finalResult } = await this.generateDelegationStages(domain, recordType, settings));
    }
    
    
    delegationStages.forEach(stage => this.steps.push(stage));

    
    if (settings.dnssecEnabled) {
      await this.simulateDNSSECValidation(domain, recordType, settings);
    }

    
    return finalResult;
  }

  async simulateDNSSECValidation(domain, recordType, settings) {
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts.slice(-2).join('.');

    
    const simulateFailure = settings.simulateDNSSECFailure || false;

    
    await this.simulateLatency(20);
    this.steps.push({
      stage: 'dnssec_root_dnskey',
      name: 'DNSSEC: Root DNSKEY Retrieval',
      description: 'Retrieving DNSKEY from root zone',
      timing: 20,
      dnssec: {
        level: 'root',
        recordType: 'DNSKEY',
        keyTag: 20326,
        algorithm: 'RSASHA256',
        publicKey: '(simulated public key)',
        valid: true
      },
      explanation: 'The root DNSKEY is the trust anchor for the entire DNSSEC chain. This public key is pre-configured in the resolver.'
    });

    
    await this.simulateLatency(25);
    this.steps.push({
      stage: 'dnssec_root_ds',
      name: `DNSSEC: Root DS for .${tld}`,
      description: `Verifying DS record for .${tld} TLD in root zone`,
      timing: 25,
      dnssec: {
        level: 'root',
        recordType: 'DS',
        keyTag: 19718,
        algorithm: 'RSASHA256',
        digestType: 'SHA256',
        digest: '(simulated digest hash)',
        valid: !simulateFailure
      },
      explanation: `The DS (Delegation Signer) record in the root zone points to the DNSKEY of the .${tld} TLD, establishing the chain of trust.`
    });

    if (simulateFailure) {
      this.steps.push({
        stage: 'dnssec_validation_failed',
        name: 'DNSSEC Validation Failed',
        description: 'DS record verification failed',
        timing: 10,
        dnssec: {
          level: 'root',
          valid: false,
          error: 'DS digest mismatch',
          securityRisk: 'high'
        },
        explanation: 'DNSSEC validation failed! The DS record digest does not match the TLD DNSKEY. This could indicate DNS spoofing or misconfiguration.'
      });
      return;
    }

    
    await this.simulateLatency(30);
    this.steps.push({
      stage: 'dnssec_tld_dnskey',
      name: `DNSSEC: .${tld} DNSKEY Retrieval`,
      description: `Retrieving DNSKEY from .${tld} TLD zone`,
      timing: 30,
      dnssec: {
        level: 'tld',
        recordType: 'DNSKEY',
        keyTag: 19718,
        algorithm: 'RSASHA256',
        publicKey: '(simulated TLD public key)',
        flags: 257, 
        valid: true
      },
      explanation: `The .${tld} TLD DNSKEY is used to verify signatures on records within the TLD zone, including DS records for second-level domains.`
    });

    
    await this.simulateLatency(25);
    this.steps.push({
      stage: 'dnssec_tld_ds',
      name: `DNSSEC: TLD DS for ${sld}`,
      description: `Verifying DS record for ${sld} in .${tld} zone`,
      timing: 25,
      dnssec: {
        level: 'tld',
        recordType: 'DS',
        keyTag: 12345,
        algorithm: 'RSASHA256',
        digestType: 'SHA256',
        digest: '(simulated domain digest)',
        valid: true
      },
      explanation: `The DS record in the .${tld} zone points to the DNSKEY of ${sld}, continuing the chain of trust.`
    });

    
    await this.simulateLatency(30);
    this.steps.push({
      stage: 'dnssec_auth_dnskey',
      name: `DNSSEC: ${sld} DNSKEY Retrieval`,
      description: `Retrieving DNSKEY from ${sld} authoritative zone`,
      timing: 30,
      dnssec: {
        level: 'authoritative',
        recordType: 'DNSKEY',
        keyTag: 12345,
        algorithm: 'RSASHA256',
        publicKey: '(simulated auth public key)',
        flags: 256, 
        valid: true
      },
      explanation: `The ${sld} DNSKEY is used to verify RRSIG signatures on actual DNS records (A, AAAA, etc.) in the zone.`
    });

    
    await this.simulateLatency(20);
    const now = new Date();
    const inception = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
    const expiration = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000); 

    this.steps.push({
      stage: 'dnssec_rrsig_verify',
      name: `DNSSEC: RRSIG Verification for ${recordType} Record`,
      description: `Verifying RRSIG signature on ${recordType} record for ${domain}`,
      timing: 20,
      dnssec: {
        level: 'authoritative',
        recordType: 'RRSIG',
        typeCovered: recordType,
        algorithm: 'RSASHA256',
        labels: parts.length,
        originalTTL: 300,
        signatureExpiration: expiration.toISOString(),
        signatureInception: inception.toISOString(),
        keyTag: 12345,
        signerName: sld,
        signature: '(simulated signature)',
        valid: true,
        daysUntilExpiration: 23
      },
      explanation: `The RRSIG (Resource Record Signature) proves that the ${recordType} record was signed by the zone owner and hasn't been modified. Signature is valid for ${23} more days.`
    });

    
    await this.simulateLatency(10);
    this.steps.push({
      stage: 'dnssec_validation_complete',
      name: 'DNSSEC Validation Complete',
      description: 'Full chain of trust validated successfully',
      timing: 10,
      dnssec: {
        level: 'summary',
        chainOfTrust: [
          { level: 'root', status: 'valid', keyTag: 20326 },
          { level: 'tld', status: 'valid', keyTag: 19718 },
          { level: 'authoritative', status: 'valid', keyTag: 12345 }
        ],
        securityScore: 100,
        validated: true,
        message: 'Complete DNSSEC chain of trust validated successfully'
      },
      explanation: 'All DNSSEC signatures have been verified. The DNS response is cryptographically proven to be authentic and unmodified.'
    });
  }

  async iterativeResolution(domain, recordType, settings) {
    
    
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts.slice(-2).join('.');

    
    const stepStart1 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    this.steps.push({
      stage: 'client_to_root_query',
      name: '🔄 Client → Root Server',
      description: 'Client queries root server directly (iterative mode)',
      server: { ...DNS_SERVERS.root[0], type: 'root' },
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart1,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client asks root server: "What is the ${recordType} record for ${domain}?" with RD (Recursion Desired) = 0, meaning "just give me a referral, I'll do the work."`
    });

    
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'root_to_client_response',
      name: '⬅️ Root Server → Client',
      description: `Root server responds with referral to .${tld} TLD servers`,
      server: { ...DNS_SERVERS.root[0], type: 'root' },
      response: {
        found: false,
        referral: true,
        nameservers: [`a.${tld}-servers.net`, `b.${tld}-servers.net`],
        glueRecords: [
          { name: `a.${tld}-servers.net`, ip: '192.5.6.30' },
          { name: `b.${tld}-servers.net`, ip: '192.33.4.12' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Root server responds: "I don't have that answer. Try asking the .${tld} TLD nameservers at these addresses (glue records provided): a.${tld}-servers.net = 192.5.6.30"`
    });

    
    const stepStart2 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    this.steps.push({
      stage: 'client_to_tld_query',
      name: `🔄 Client → .${tld} TLD Server`,
      description: `Client follows referral and queries .${tld} TLD server`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart2,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client uses the glue record to contact the TLD server and asks: "What is the ${recordType} record for ${domain}?"`
    });

    
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'tld_to_client_response',
      name: `⬅️ .${tld} TLD Server → Client`,
      description: `TLD server responds with referral to ${sld} authoritative servers`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      response: {
        found: false,
        referral: true,
        nameservers: [`ns1.${sld}`, `ns2.${sld}`],
        glueRecords: [
          { name: `ns1.${sld}`, ip: '93.184.216.34' },
          { name: `ns2.${sld}`, ip: '93.184.216.35' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `TLD server responds: "I don't have that answer. The authoritative nameservers for ${sld} are ns1.${sld} and ns2.${sld}. Here are their IP addresses (glue records): ns1.${sld} = 93.184.216.34"`
    });

    
    const stepStart3 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    const result = await this.performActualDNSQuery(domain, recordType);
  const isSimulated = result.records && result.records.some(r => r.simulated);
  const querySucceeded = result.records && result.records.length > 0; 

    this.steps.push({
      stage: 'client_to_auth_query',
      name: `🔄 Client → Authoritative Server`,
      description: `Client queries authoritative nameserver for final answer`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart3,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client contacts the authoritative server and asks: "What is the ${recordType} record for ${domain}?"`
    });

    
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'auth_to_client_response',
      name: `⬅️ Authoritative Server → Client`,
      description: querySucceeded
        ? `Authoritative server provides final answer to client`
        : `Authoritative server returns NXDOMAIN - domain not found`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      response: {
        found: querySucceeded,
        records: querySucceeded ? result.records : [],
        ttl: result.ttl,
        rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
        authoritative: true,
        recursionAvailable: false,
        simulated: isSimulated || undefined,
        error: !querySucceeded ? 'DNS resolution failed' : undefined
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateResponsePacket(domain, recordType, result),
      explanation: querySucceeded
        ? (isSimulated
            ? `⚠️ Authoritative server returns a simulated fallback answer (actual DNS query failed). ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}.`
            : `✅ Authoritative server responds with the FINAL ANSWER: ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}. The AA (Authoritative Answer) flag is set to 1. Resolution complete! TTL = ${result.ttl} seconds.`)
        : `❌ Authoritative server states that ${domain} does not exist (NXDOMAIN).`
    });

    
    if (settings.cacheEnabled && querySucceeded) {
      const cacheKey = `${domain}:${recordType}`;
      browserCache.set(cacheKey, result, result.ttl);
      osCache.set(cacheKey, result, result.ttl);
    }
  }

  async performActualDNSQuery(domain, recordType) {
    try {
      let records = [];
      let ttl = 300;

      switch (recordType) {
        case 'A':
          const addresses = await dns.resolve4(domain);
          records = addresses.map(addr => ({ type: 'A', address: addr }));
          break;
        case 'AAAA':
          const addresses6 = await dns.resolve6(domain);
          records = addresses6.map(addr => ({ type: 'AAAA', address: addr }));
          break;
        case 'CNAME':
          const cnames = await dns.resolveCname(domain);
          records = cnames.map(cname => ({ type: 'CNAME', value: cname }));
          break;
        case 'MX':
          const mxRecords = await dns.resolveMx(domain);
          records = mxRecords.map(mx => ({ type: 'MX', priority: mx.priority, exchange: mx.exchange }));
          break;
        case 'NS':
          const nsRecords = await dns.resolveNs(domain);
          records = nsRecords.map(ns => ({ type: 'NS', nameserver: ns }));
          break;
        case 'TXT':
          const txtRecords = await dns.resolveTxt(domain);
          records = txtRecords.map(txt => ({ type: 'TXT', data: txt.join('') }));
          break;
        default:
          const defaultAddrs = await dns.resolve4(domain);
          records = defaultAddrs.map(addr => ({ type: 'A', address: addr }));
      }

      return { records, ttl };
    } catch (error) {
      
      return {
        records: [{ type: recordType, value: 'Simulated response (actual DNS query failed)', simulated: true }],
        ttl: 300
      };
    }
  }

  generatePacket(domain, recordType, response) {
    const packet = {
      id: Math.floor(Math.random() * 65535),
      type: response ? 'response' : 'query',
      flags: {
        qr: response ? 1 : 0,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: 1,
        ra: response ? 1 : 0,
        z: 0,
        rcode: response ? 0 : 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: response ? (response.records || []).map(r => ({
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1,
        ttl: response.ttl || 300,
        data: r
      })) : [],
      authorities: [],
      additionals: []
    };

    return packet;
  }

  generateQueryPacket(domain, recordType, recursionDesired) {
    return {
      id: Math.floor(Math.random() * 65535),
      type: 'query',
      flags: {
        qr: 0,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: recursionDesired ? 1 : 0,
        ra: 0,
        z: 0,
        rcode: 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: [],
      authorities: [],
      additionals: []
    };
  }

  generateResponsePacket(domain, recordType, result) {
    return {
      id: Math.floor(Math.random() * 65535),
      type: 'response',
      flags: {
        qr: 1,
        opcode: 0,
        aa: 1,
        tc: 0,
        rd: 1,
        ra: 1,
        z: 0,
        rcode: 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: (result.records || []).map(r => ({
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1,
        ttl: result.ttl || 300,
        data: r
      })),
      authorities: [],
      additionals: []
    };
  }

  async simulateLatency(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DNSResolver();
