





const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class LiveDNSTracer {
  constructor() {
    this.stages = [];
  }

  





  getSkippedLevels(delegatedZone, targetDomain) {
    if (!targetDomain) return [];
    
    const delegatedParts = delegatedZone.split('.');
    const targetParts = targetDomain.split('.');
    
    const skipped = [];
    
    
    
    for (let i = delegatedParts.length - 1; i > 0; i--) {
      const potentialZone = delegatedParts.slice(i).join('.');
      if (potentialZone !== delegatedZone && potentialZone.split('.').length < delegatedParts.length) {
        skipped.push(potentialZone);
      }
    }
    
    return skipped;
  }

  





  async trace(domain, recordType = 'A') {
    this.stages = [];
    
    try {
      
      const command = `dig +trace ${domain} ${recordType}`;
      const startTime = Date.now();
      
      console.log(`[LIVE DNS] Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, 
        maxBuffer: 10 * 1024 * 1024 
      });
      
      const totalTime = Date.now() - startTime;
      
      if (stderr && !stderr.includes('communications error')) {
        console.warn(`[LIVE DNS] Warnings:`, stderr);
      }
      
      
      const parsedStages = this.parseDigTrace(stdout, domain, recordType);
      
      
      const detailedStages = this.enhanceStagesWithAttempts(parsedStages, stdout);
      
      
      const errors = this.extractErrorsAndWarnings(stdout);
      console.log(`[LIVE DNS] Detected ${errors.summary.totalIssues} issues`);
      
      return {
        success: true,
        domain,
        recordType,
        stages: detailedStages,
        errors, 
        totalTime,
        timestamp: new Date().toISOString(),
        isLive: true,
        rawOutput: stdout 
      };
      
    } catch (error) {
      console.error(`[LIVE DNS] Error executing dig:`, error.message);
      return {
        success: false,
        domain,
        recordType,
        error: error.message,
        stages: [],
        isLive: true,
          attempts: stageAttempts 
      };
    }
  }

  




  extractErrorsAndWarnings(output) {
    const errors = {
      ipv6Failures: [],
      timeouts: [],
      communicationErrors: [],
      otherWarnings: [],
      summary: {
        totalIssues: 0,
        criticalErrors: 0,
        warnings: 0
      }
    };

    const lines = output.split('\n');
    
    for (const line of lines) {
      
      if (line.includes('network unreachable') && line.includes('2001:')) {
        const match = line.match(/UDP setup with\s+([^#]+)#(\d+)\(([^)]+)\)\s+for\s+(\S+)\s+failed:\s+network unreachable/);
        if (match) {
          errors.ipv6Failures.push({
            server: `${match[1]}#${match[2]} (${match[3]})`,
            domain: match[4],
            reason: 'IPv6 network unreachable',
            explanation: 'The system attempted to use IPv6 but your network does not support it. This is normal and DNS falls back to IPv4.',
            severity: 'warning',
            impact: 'No impact - DNS automatically retries with IPv4'
          });
        }
      }
      
      
      if (line.includes('timed out')) {
        const match = line.match(/communications error to\s+([^#]+)#(\d+):\s+timed out/);
        if (match) {
          errors.timeouts.push({
            server: match[1],
            port: match[2],
            reason: 'Connection timeout',
            explanation: 'The DNS server did not respond within the timeout period. This can happen due to network congestion, firewall rules, or server load.',
            severity: 'warning',
            impact: 'DNS will retry with other nameservers automatically'
          });
        }
      }
      
      
      if (line.includes('no servers could be reached')) {
        errors.communicationErrors.push({
          reason: 'No servers could be reached',
          explanation: 'All attempts to contact the current set of servers failed. This message appears after IPv6 attempts before IPv4 retry.',
          severity: 'info',
          impact: 'DNS continues with IPv4 servers'
        });
      }
      
      
      if (line.includes('UDP setup') && line.includes('failed')) {
        const match = line.match(/UDP setup with\s+(\S+)\s+for\s+(\S+)\s+failed:\s+(.+)/);
        if (match) {
          errors.communicationErrors.push({
            server: match[1],
            domain: match[2],
            reason: match[3],
            explanation: 'Failed to establish UDP connection for DNS query.',
            severity: 'warning',
            impact: 'DNS falls back to alternative servers or protocols'
          });
        }
      }
      
      
      if (line.startsWith(';;') && !line.includes('Received') && !line.includes('global options')) {
        if (line.length > 3) {
          errors.otherWarnings.push({
            message: line.replace(/^;;\s*/, ''),
            severity: 'info'
          });
        }
      }
    }
    
    
    errors.summary.totalIssues = 
      errors.ipv6Failures.length + 
      errors.timeouts.length + 
      errors.communicationErrors.length + 
      errors.otherWarnings.length;
    
    errors.summary.criticalErrors = errors.timeouts.filter(e => e.severity === 'error').length;
    errors.summary.warnings = errors.ipv6Failures.length + errors.timeouts.length;
    
    return errors;
  }

  






  enhanceStagesWithAttempts(stages, rawOutput) {
    const lines = rawOutput.split('\n');
    const enhanced = stages.map(stage => ({
      ...stage,
      attempts: [],
      records_returned: [],
      dnssec_records: stage.dnssec || []
    }));

    let currentStageIndex = -1;
    let attemptIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      
      if (line.includes(';; Received') && line.includes('from')) {
        currentStageIndex++;
        attemptIndex = 0;
        
        
        const match = line.match(/Received (\d+) bytes from ([^#]+)#(\d+)\(([^)]+)\) in (\d+) ms/);
        if (match && enhanced[currentStageIndex]) {
          const [, bytes, ip, port, hostname, timeMs] = match;
          
          enhanced[currentStageIndex].attempts.push({
            attempt_index: attemptIndex++,
            target_ip: ip,
            target_hostname: hostname,
            family: ip.includes(':') ? 'ipv6' : 'ipv4',
            protocol: 'udp',
            result: 'success',
            time_ms: parseInt(timeMs),
            bytes_received: parseInt(bytes),
            raw_line: line.trim()
          });
          
          
          enhanced[currentStageIndex].responding_server = {
            hostname,
            ip,
            port: parseInt(port)
          };
        }
        continue;
      }

      
      if (line.includes('UDP setup') && line.includes('failed')) {
        const match = line.match(/UDP setup with\s+([^#]+)#(\d+)\(([^)]+)\)\s+for\s+(\S+)\s+failed:\s+(.+)/);
        if (match && currentStageIndex >= 0 && enhanced[currentStageIndex]) {
          const [, ip, port, hostname, domain, reason] = match;
          
          enhanced[currentStageIndex].attempts.push({
            attempt_index: attemptIndex++,
            target_ip: ip,
            target_hostname: hostname,
            family: ip.includes(':') ? 'ipv6' : 'ipv4',
            protocol: 'udp',
            result: reason.includes('network unreachable') ? 'network_unreachable' : 'failed',
            time_ms: null,
            bytes_received: 0,
            raw_line: line.trim(),
            error_message: reason
          });
        }
        continue;
      }

      
      if (line.includes('communications error')) {
        const match = line.match(/communications error to\s+([^#]+)#(\d+):\s+(.+)/);
        if (match && currentStageIndex >= 0 && enhanced[currentStageIndex]) {
          const [, ip, port, reason] = match;
          
          enhanced[currentStageIndex].attempts.push({
            attempt_index: attemptIndex++,
            target_ip: ip,
            target_hostname: null,
            family: ip.includes(':') ? 'ipv6' : 'ipv4',
            protocol: 'udp',
            result: reason.includes('timed out') ? 'timeout' : 'error',
            time_ms: null,
            bytes_received: 0,
            raw_line: line.trim(),
            error_message: reason
          });
        }
        continue;
      }

      
      if (line.match(/^\S+\s+\d+\s+IN\s+(A|AAAA|NS|MX|CNAME|TXT|SOA)\s+/) && currentStageIndex >= 0) {
        const recordMatch = line.match(/^(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)$/);
        if (recordMatch && enhanced[currentStageIndex]) {
          const [, name, ttl, type, value] = recordMatch;
          enhanced[currentStageIndex].records_returned.push({
            name,
            ttl: parseInt(ttl),
            type,
            value: value.trim()
          });
        }
      }
    }

    return enhanced;
  }

  







  parseDigTrace(output, domain, recordType) {
    const stages = [];
    const lines = output.split('\n');
    
    let currentRecords = []; 
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      
      if (!line || line.startsWith(';; global options')) {
        continue;
      }
      
      
      if (line.startsWith(';; Received')) {
        if (currentRecords.length > 0) {
          console.log(`[PARSER] Processing ${currentRecords.length} records before: ${line}`);
          console.log(`[PARSER] First record: ${currentRecords[0]}`);
          console.log(`[PARSER] Last record: ${currentRecords[currentRecords.length - 1]}`);
          
          
          const splitStages = this.splitRecordsIntoStages(currentRecords, domain, recordType, line);
          console.log(`[PARSER] Created ${splitStages.length} stages, types: ${splitStages.map(s => s.type).join(', ')}`);
          stages.push(...splitStages);
          currentRecords = [];
        }
        continue;
      }
      
      
      if (line.startsWith(';;')) {
        continue;
      }
      
      
      if (line.includes('\tIN\t') || line.match(/\s+IN\s+/)) {
        currentRecords.push(line);
      }
    }
    
    
    if (currentRecords.length > 0) {
      const splitStages = this.splitRecordsIntoStages(currentRecords, domain, recordType, null);
      stages.push(...splitStages);
    }
    
    return stages;
  }
  
  








  splitRecordsIntoStages(records, domain, recordType, receivedLine) {
    if (records.length === 0) return [];
    
    const stages = [];
    let currentStageRecords = [];
    let currentZone = null;
    let currentRecordType = null; 
    
    for (const record of records) {
      
      const nsMatch = record.match(/^(\S+)\s+\d+\s+IN\s+NS\s+/);
      
      const soaMatch = record.match(/^(\S+)\s+\d+\s+IN\s+SOA\s+/);
      
      if (nsMatch) {
        const zone = nsMatch[1];
        
        
        if ((currentZone && zone !== currentZone) || currentRecordType === 'SOA') {
          
          const stage = this.createStageFromRecords(currentStageRecords, domain, recordType, receivedLine);
          if (stage) {
            stages.push(stage);
          }
          currentStageRecords = [];
        }
        
        currentZone = zone;
        currentRecordType = 'NS';
      } else if (soaMatch) {
        
        
        if (currentStageRecords.length > 0) {
          const stage = this.createStageFromRecords(currentStageRecords, domain, recordType, receivedLine);
          if (stage) {
            stages.push(stage);
          }
          currentStageRecords = [];
        }
        
        currentZone = soaMatch[1];
        currentRecordType = 'SOA';
      }
      
      currentStageRecords.push(record);
    }
    
    
    if (currentStageRecords.length > 0) {
      const stage = this.createStageFromRecords(currentStageRecords, domain, recordType, receivedLine);
      if (stage) {
        stages.push(stage);
      }
    }
    
    return stages;
  }
  
  







  createStageFromRecords(records, domain, recordType, receivedLine) {
    if (records.length === 0) return null;
    
    const stage = {
      nameservers: [],
      dnssec: [],
      ttl: null,
      receivedFrom: null,
      serverIP: null,
      receivedBytes: null,
      responseTime: null,
      soa: null,  
      status: 'success'  
    };
    
    
    if (receivedLine) {
      const receivedMatch = receivedLine.match(/Received (\d+) bytes from ([^#]+)#(\d+)\(([^)]+)\) in (\d+) ms/);
      if (receivedMatch) {
        stage.receivedBytes = parseInt(receivedMatch[1]);
        stage.serverIP = receivedMatch[2];
        stage.receivedFrom = receivedMatch[4];
        stage.responseTime = parseInt(receivedMatch[5]);
      }
    }
    
    
    const firstRecord = records[0];
    
    
    if (firstRecord.match(/^\.\s+\d+\s+IN\s+NS/)) {
      stage.type = 'root';
      stage.zone = '.';
      
      
      for (const record of records) {
        const nsMatch = record.match(/^\.\s+(\d+)\s+IN\s+NS\s+(\S+)/);
        if (nsMatch) {
          stage.ttl = parseInt(nsMatch[1]);
          stage.nameservers.push(nsMatch[2].replace(/\.$/, ''));
        }
        
        const dnssecMatch = record.match(/^(\S+)\s+(\d+)\s+IN\s+(DS|RRSIG|NSEC3|DNSKEY)\s+(.+)$/);
        if (dnssecMatch) {
          stage.dnssec.push({
            name: dnssecMatch[1],
            ttl: parseInt(dnssecMatch[2]),
            type: dnssecMatch[3],
            data: dnssecMatch[4]
          });
        }
      }
    }
    
    else if (firstRecord.match(/^[a-zA-Z0-9.-]+\.\s+\d+\s+IN\s+NS/)) {
      const zoneMatch = firstRecord.match(/^([a-zA-Z0-9.-]+\.)\s+/);
      stage.zone = zoneMatch ? zoneMatch[1].replace(/\.$/, '') : 'unknown';
      
      
      const knownTLDs = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'in', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'br', 'ru', 'za', 'nz', 'sg', 'hk', 'tw', 'kr', 'th', 'vn', 'ph', 'my', 'id', 'io', 'ai', 'co'];
      
      if (knownTLDs.includes(stage.zone)) {
        stage.type = 'tld';
      } else {
        
        const isDelegation = stage.zone !== domain && domain.endsWith('.' + stage.zone);
        stage.type = isDelegation ? 'delegation' : 'authoritative';
        stage.isDelegation = isDelegation;
        stage.delegatesTo = isDelegation ? domain : null;
      }
      
      
      for (const record of records) {
        const nsMatch = record.match(/^\S+\s+(\d+)\s+IN\s+NS\s+(\S+)/);
        if (nsMatch) {
          stage.ttl = parseInt(nsMatch[1]);
          stage.nameservers.push(nsMatch[2].replace(/\.$/, ''));
        }
        const dnssecMatch = record.match(/^(\S+)\s+(\d+)\s+IN\s+(DS|RRSIG|NSEC3|DNSKEY)\s+(.+)$/);
        if (dnssecMatch) {
          stage.dnssec.push({
            name: dnssecMatch[1],
            ttl: parseInt(dnssecMatch[2]),
            type: dnssecMatch[3],
            data: dnssecMatch[4]
          });
        }
      }
    }
    
    else if (firstRecord.match(new RegExp(`\\s+IN\\s+${recordType}\\s+`))) {
      stage.type = 'final';
      stage.zone = domain;
      
      const answerMatch = firstRecord.match(/^(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)$/);
      if (answerMatch) {
        stage.recordType = answerMatch[3];
        stage.ttl = parseInt(answerMatch[2]);
        stage.answer = answerMatch[4];
      }
    }
    
    else if (firstRecord.match(/\s+IN\s+SOA\s+/)) {
      stage.type = 'nxdomain';
      stage.status = 'NXDOMAIN';
      
      
      const soaMatch = firstRecord.match(/^(\S+)\s+(\d+)\s+IN\s+SOA\s+(.+)$/);
      if (soaMatch) {
        stage.zone = soaMatch[1].replace(/\.$/, '');
        stage.ttl = parseInt(soaMatch[2]);
        stage.soa = {
          zone: soaMatch[1].replace(/\.$/, ''),
          ttl: parseInt(soaMatch[2]),
          data: soaMatch[3]
        };
      }
      
      
      for (const record of records) {
        const nsec3Match = record.match(/^(\S+)\s+(\d+)\s+IN\s+(NSEC|NSEC3)\s+(.+)$/);
        if (nsec3Match) {
          stage.dnssec.push({
            name: nsec3Match[1],
            ttl: parseInt(nsec3Match[2]),
            type: nsec3Match[3],
            data: nsec3Match[4]
          });
        }
        
        
        const rrsigMatch = record.match(/^(\S+)\s+(\d+)\s+IN\s+RRSIG\s+(.+)$/);
        if (rrsigMatch) {
          stage.dnssec.push({
            name: rrsigMatch[1],
            ttl: parseInt(rrsigMatch[2]),
            type: 'RRSIG',
            data: rrsigMatch[3]
          });
        }
      }
    }
    
    return stage;
  }

  




  detectActualServerType(hostname) {
    if (!hostname) return 'unknown';
    
    const lowerHostname = hostname.toLowerCase();
    
    
    
    
    
    if (lowerHostname.match(/^127\./) ||           
        lowerHostname === 'localhost' ||
        lowerHostname === '::1' ||
        lowerHostname.includes('systemd-resolved')) {
      return 'resolver';
    }
    
    
    if (lowerHostname.includes('root-servers.net')) {
      return 'root';
    }
    
    
    if (lowerHostname.includes('gtld-servers.net') ||  
        lowerHostname.includes('cctld') ||             
        lowerHostname.includes('registry.in') ||        
        lowerHostname.includes('trs-dns') ||            
        lowerHostname.match(/\.(in|uk|de|fr|jp|cn|au|br|ru|za|nz|sg|hk|tw|kr|th|vn|ph|my|id)-servers?\./)) {
      return 'tld';
    }
    
    
    return 'authoritative';
  }

  




  formatForVisualization(stages) {
    const visualStages = [];
    let stepNumber = 1;
    
    console.log(`[FORMAT] Formatting ${stages.length} stages for visualization`);
    
    for (const stage of stages) {
      
      const stageAttempts = stage.attempts || [];
      console.log(`[FORMAT] Stage type=${stage.type}, attempts count=${stageAttempts.length}`);
      
      if (stage.type === 'root') {
        
        const actualServerType = this.detectActualServerType(stage.receivedFrom);
        const isLocalResolver = actualServerType === 'resolver';
        
        
        visualStages.push({
          step: stepNumber++,
          stage: isLocalResolver ? 'local_resolver_query' : 'root_query',
          name: isLocalResolver ? '🏠 Query Local DNS Resolver' : '🌐 Query Root Servers',
          description: isLocalResolver 
            ? 'Querying local DNS resolver for root server information'
            : 'Querying root DNS servers to find TLD nameservers',
          server: {
            name: isLocalResolver ? 'Local DNS Resolver' : 'Root DNS Servers',
            type: isLocalResolver ? 'resolver' : 'root',
            nameservers: stage.nameservers,
            ip: stage.serverIP || 'Multiple IPs'
          },
          query: {
            zone: stage.zone,
            type: 'NS'
          },
          timing: stage.responseTime || 0,
          messageType: 'QUERY',
          direction: 'request',
          isLive: true,
          attempts: stageAttempts 
        });
        
        
        visualStages.push({
          step: stepNumber++,
          stage: isLocalResolver ? 'local_resolver_response' : 'root_response',
          name: isLocalResolver 
            ? `✅ Local Resolver Response (Cached Root NS)` 
            : `✅ Root Servers Response`,
          description: isLocalResolver
            ? `Local resolver provides cached list of ${stage.nameservers.length} root servers`
            : `Root servers provide ${stage.nameservers.length} TLD nameservers`,
          server: {
            name: stage.receivedFrom || (isLocalResolver ? 'Local Resolver' : 'Root Server'),
            type: actualServerType,  
            ip: stage.serverIP,
            nameservers: stage.nameservers
          },
          response: {
            nameservers: stage.nameservers,
            ttl: stage.ttl,
            dnssec: (stage.dnssec && stage.dnssec.length > 0) || false,
            cached: isLocalResolver  
          },
          timing: stage.responseTime,
          receivedBytes: stage.receivedBytes,
          messageType: 'RESPONSE',
          direction: 'response',
          isLive: true,
          hasDNSSEC: (stage.dnssec && stage.dnssec.length > 0) || false,
          dnssecRecords: stage.dnssec || [],
          isLocalResolver: isLocalResolver,  
          attempts: stageAttempts 
        });
      }
      
      else if (stage.type === 'tld') {
        
        const actualServerType = this.detectActualServerType(stage.receivedFrom);
        const isRootResponding = actualServerType === 'root';
        
        
        
        visualStages.push({
          step: stepNumber++,
          stage: isRootResponding ? 'root_query' : 'tld_query',
          name: isRootResponding 
            ? `🌐 Query Root Server for .${stage.zone} TLD`
            : `🔄 Query .${stage.zone} TLD Servers`,
          description: isRootResponding
            ? `Querying root server to find .${stage.zone} TLD nameservers`
            : `Querying TLD servers for ${stage.zone} domain nameservers`,
          server: {
            name: isRootResponding ? 'Root DNS Server' : `${stage.zone} TLD`,
            type: isRootResponding ? 'root' : 'tld',
            zone: stage.zone,
            nameservers: stage.nameservers
          },
          query: {
            zone: stage.zone,
            type: 'NS'
          },
          timing: stage.responseTime || 0,
          messageType: 'QUERY',
          direction: 'request',
          isLive: true,
          attempts: stageAttempts 
        });
        
        
        
        visualStages.push({
          step: stepNumber++,
          stage: isRootResponding ? 'root_response' : 'tld_response',
          name: isRootResponding 
            ? `✅ Root Server Provides .${stage.zone} TLD Delegation`
            : `✅ .${stage.zone} TLD Response`,
          description: isRootResponding
            ? `Root server provides ${stage.nameservers.length} .${stage.zone} TLD nameservers`
            : `TLD provides ${stage.nameservers.length} authoritative nameservers`,
          server: {
            name: stage.receivedFrom || (isRootResponding ? 'Root Server' : `${stage.zone} TLD Server`),
            type: actualServerType,  
            ip: stage.serverIP,
            zone: stage.zone
          },
          response: {
            nameservers: stage.nameservers,
            ttl: stage.ttl,
            dnssec: (stage.dnssec && stage.dnssec.length > 0) || false,
            delegationFor: stage.zone  
          },
          timing: stage.responseTime,
          receivedBytes: stage.receivedBytes,
          messageType: 'RESPONSE',
          direction: 'response',
          isLive: true,
          hasDNSSEC: (stage.dnssec && stage.dnssec.length > 0) || false,
          dnssecRecords: stage.dnssec || [],
          isRootProvidingTLD: isRootResponding  
        });
      }
      
      else if (stage.type === 'authoritative' || stage.type === 'delegation') {
        const isDelegation = stage.isDelegation || false;
        const delegationType = isDelegation ? 'subdomain delegation' : 'authoritative';
        
        
        const actualServerType = this.detectActualServerType(stage.receivedFrom);
        const isTLDResponding = actualServerType === 'tld';
        
        console.log(`[FORMAT] Delegation stage: zone=${stage.zone}, receivedFrom=${stage.receivedFrom}, actualServerType=${actualServerType}, isTLDResponding=${isTLDResponding}, isDelegation=${isDelegation}`);
        
        
        const tld = stage.zone.includes('.') ? stage.zone.split('.').pop() : stage.zone;
        
        
        
        
        const queryStage = isTLDResponding ? 'tld_query' : (isDelegation ? 'delegation_query' : 'authoritative_query');
        const responseStage = isTLDResponding ? 'tld_response' : (isDelegation ? 'delegation_response' : 'authoritative_response');
        
        
        let queryName, queryDesc, serverName, serverType;
        
        if (isTLDResponding) {
          
          queryName = `🔄 Query .${tld} TLD Server`;
          queryDesc = `Querying .${tld} TLD servers for nameservers of ${stage.zone}`;
          serverName = `.${tld} TLD Server`;
          serverType = 'tld';
        } else if (isDelegation) {
          
          queryName = `🔗 Query ${stage.zone} Delegation`;
          queryDesc = `Querying delegated nameservers for ${stage.zone}`;
          serverName = `${stage.zone} Delegation`;
          serverType = 'delegation';
        } else {
          
          queryName = `🎯 Query Authoritative Server`;
          queryDesc = `Querying authoritative nameservers for ${stage.zone}`;
          serverName = 'Authoritative DNS';
          serverType = 'authoritative';
        }
        
        
        visualStages.push({
          step: stepNumber++,
          stage: queryStage,
          name: queryName,
          description: queryDesc,
          server: {
            name: serverName,
            type: serverType,
            zone: stage.zone,
            nameservers: stage.nameservers
          },
          query: {
            domain: stage.zone,
            type: 'NS'
          },
          timing: stage.responseTime || 0,
          messageType: 'QUERY',
          direction: 'request',
          isLive: true,
          isDelegation: isDelegation,
          delegationInfo: isDelegation ? {
            parentZone: stage.zone.split('.').slice(1).join('.'),
            delegatedZone: stage.zone,
            reason: 'Parent zone has direct NS records for this subdomain',
            skippedLevels: this.getSkippedLevels(stage.zone, stage.delegatesTo)
          } : null,
          attempts: stageAttempts
        });
        
        
        let responseName, responseDesc;
        
        if (isTLDResponding && isDelegation) {
          
          responseName = `✅ .${tld} TLD Provides ${stage.zone} Delegation`;
          responseDesc = `TLD server delegates to ${stage.nameservers.length} nameservers for ${stage.zone}`;
        } else if (isTLDResponding) {
          
          responseName = `✅ .${tld} TLD Provides ${stage.zone} Nameservers`;
          responseDesc = `TLD server provides ${stage.nameservers.length} authoritative nameservers for ${stage.zone}`;
        } else if (isDelegation) {
          
          responseName = `✅ ${stage.zone} Delegation Response`;
          responseDesc = `Delegation provides ${stage.nameservers.length} nameservers for ${stage.zone}`;
        } else {
          
          responseName = `✅ Authoritative Nameservers`;
          responseDesc = `Domain has ${stage.nameservers.length} authoritative nameservers`;
        }
        
        
        visualStages.push({
          step: stepNumber++,
          stage: responseStage,
          name: responseName,
          description: responseDesc,
          server: {
            name: stage.receivedFrom || serverName,
            type: actualServerType,  
            ip: stage.serverIP,
            zone: stage.zone
          },
          response: {
            nameservers: stage.nameservers,
            ttl: stage.ttl,
            dnssec: (stage.dnssec && stage.dnssec.length > 0) || false
          },
          timing: stage.responseTime,
          receivedBytes: stage.receivedBytes,
          messageType: 'RESPONSE',
          direction: 'response',
          isLive: true,
          hasDNSSEC: (stage.dnssec && stage.dnssec.length > 0) || false,
          dnssecRecords: stage.dnssec || [],
          isDelegation: isDelegation,
          isTLDProvidingAuth: isTLDResponding,  
          delegationInfo: (isTLDResponding && isDelegation) ? {
            explanation: `The .${tld} TLD directly delegates authority to ${stage.zone}, skipping intermediate levels like .ac.${tld}`,
            impact: 'DNS resolution skips intermediate levels in the hierarchy',
            benefit: 'Faster resolution with fewer queries needed'
          } : null,
          attempts: stageAttempts
        });
      }
      
      else if (stage.type === 'final') {
        
        const actualServerType = this.detectActualServerType(stage.receivedFrom);
        
        
        visualStages.push({
          step: stepNumber++,
          stage: 'final_query',
          name: `🔍 Query for ${stage.recordType} Record`,
          description: `Requesting ${stage.recordType} record for ${stage.zone}`,
          server: {
            name: 'Authoritative Server',
            type: 'authoritative',
            zone: stage.zone
          },
          query: {
            domain: stage.zone,
            type: stage.recordType
          },
          timing: stage.responseTime || 0,
          messageType: 'QUERY',
          direction: 'request',
          isLive: true,
          attempts: stageAttempts 
        });
        
        
        visualStages.push({
          step: stepNumber++,
          stage: 'final_answer',
          name: `✅ Final Answer`,
          description: `${stage.recordType} record: ${stage.answer}`,
          server: {
            name: stage.receivedFrom || 'Authoritative Server',
            type: actualServerType,  
            ip: stage.serverIP,
            zone: stage.zone
          },
          response: {
            record: stage.recordType,
            answer: stage.answer,
            ttl: stage.ttl
          },
          timing: stage.responseTime,
          receivedBytes: stage.receivedBytes,
          messageType: 'RESPONSE',
          direction: 'response',
          isLive: true,
          isFinalAnswer: true
        });
      }
      
      else if (stage.type === 'nxdomain') {
        
        const actualServerType = this.detectActualServerType(stage.receivedFrom);
        
        
        const tld = stage.zone.includes('.') ? stage.zone : stage.zone;
        const serverName = stage.receivedFrom || `${tld} Server`;
        
        
        visualStages.push({
          step: stepNumber++,
          stage: 'nxdomain_query',
          name: `🔍 Query ${tld} for Domain`,
          description: `Querying ${tld} servers for domain existence`,
          server: {
            name: actualServerType === 'tld' ? `.${tld} TLD Server` : serverName,
            type: actualServerType,
            zone: stage.zone
          },
          query: {
            domain: stage.zone,
            type: 'A'
          },
          timing: stage.responseTime || 0,
          messageType: 'QUERY',
          direction: 'request',
          isLive: true,
          attempts: stageAttempts 
        });
        
        
        visualStages.push({
          step: stepNumber++,
          stage: 'nxdomain_response',
          name: `❌ Domain Not Found (NXDOMAIN)`,
          description: `${serverName} authoritatively states that this domain does not exist`,
          server: {
            name: serverName,
            type: actualServerType,
            ip: stage.serverIP,
            zone: stage.zone
          },
          response: {
            status: 'NXDOMAIN',
            soa: stage.soa,
            nsec3: stage.nsec3 || [],
            ttl: stage.soa?.ttl || 900,
            explanation: `The authoritative server for ${stage.zone} confirms this domain doesn't exist. The SOA record provides details about the zone, and NSEC3 records cryptographically prove non-existence.`
          },
          timing: stage.responseTime,
          receivedBytes: stage.receivedBytes,
          messageType: 'RESPONSE',
          direction: 'response',
          isLive: true,
          isNXDOMAIN: true,
          dnssecRecords: stage.nsec3 || []
        });
      }
    }
    
    return visualStages;
  }

  




  generateStructuredExport(traceResult) {
    const structured = {
      query: {
        name: traceResult.domain,
        qtype: traceResult.recordType
      },
      start_time: traceResult.timestamp,
      duration_ms: traceResult.totalTime,
      raw_output: traceResult.rawOutput,
      steps: []
    };

    traceResult.stages.forEach((stage, index) => {
      const stepType = this.getStepType(stage);
      const roleDescription = this.getRoleDescription(stage, stepType);
      
      const step = {
        step_index: index,
        step_type: stepType,
        name: stage.zone || stage.domain || '.',
        role: roleDescription.role,  
        returned_records: roleDescription.returnedRecords,  
        records_returned: stage.records_returned || [],
        responding_server: stage.responding_server || { hostname: null, ip: null, port: 53 },
        attempts: stage.attempts || [],
        dnssec: (stage.dnssec_records || stage.dnssec || []).map(d => ({
          type: d.type,
          data: d.data || d.value,
          parsed: this.parseDNSSECRecord(d)
        })),
        notes: this.generateStepNotes(stage)
      };

      
      step.timing_summary = this.calculateTimingSummary(stage.attempts);

      structured.steps.push(step);
    });

    return structured;
  }

  


  getRoleDescription(stage, stepType) {
    const zone = stage.zone || '.';
    
    if (stepType === 'root') {
      return {
        role: 'Root Query',
        returnedRecords: 'Root NS list'
      };
    } else if (stepType === 'tld') {
      return {
        role: 'TLD Delegation',
        returnedRecords: `NS records for .${zone}`
      };
    } else if (stepType === 'referral') {
      return {
        role: 'Subdomain Delegation',
        returnedRecords: `NS records for ${zone}`
      };
    } else if (stepType === 'final_answer') {
      return {
        role: 'Final Answer',
        returnedRecords: `${stage.recordType || 'A'} record(s)`
      };
    }
    
    return {
      role: 'Authoritative Query',
      returnedRecords: 'NS or A records'
    };
  }

  


  getStepType(stage) {
    if (stage.type === 'root') return 'root';
    if (stage.type === 'tld') return 'tld';
    if (stage.type === 'delegation' || stage.isDelegation) return 'referral';
    if (stage.type === 'final') return 'final_answer';
    if (stage.type === 'authoritative') return 'authoritative';
    return 'unknown';
  }

  


  parseDNSSECRecord(record) {
    const parsed = {};
    
    if (record.type === 'RRSIG') {
      
      const parts = (record.data || '').split(/\s+/);
      if (parts.length >= 8) {
        parsed.type_covered = parts[0];
        parsed.algorithm = parts[1];
        parsed.labels = parts[2];
        parsed.orig_ttl = parts[3];
        parsed.sig_expiration = parts[4];
        parsed.sig_inception = parts[5];
        parsed.key_tag = parts[6];
        parsed.signer_name = parts[7];
      }
    } else if (record.type === 'DS') {
      
      const parts = (record.data || '').split(/\s+/);
      if (parts.length >= 4) {
        parsed.key_tag = parts[0];
        parsed.algorithm = parts[1];
        parsed.digest_type = parts[2];
        parsed.digest = parts.slice(3).join('');
      }
    }
    
    return parsed;
  }

  


  generateStepNotes(stage) {
    const notes = [];
    
    if (stage.attempts && stage.attempts.length > 1) {
      const failures = stage.attempts.filter(a => a.result !== 'success');
      if (failures.length > 0) {
        notes.push(`${failures.length} attempt(s) failed before success`);
      }
    }
    
    if (stage.isDelegation) {
      notes.push('Subdomain delegation');
    }
    
    return notes; 
  }

  


  calculateTimingSummary(attempts) {
    if (!attempts || attempts.length === 0) {
      return { total_time_ms: null, successful_time_ms: null, failed_attempts: 0 };
    }

    const successful = attempts.find(a => a.result === 'success');
    const failed = attempts.filter(a => a.result !== 'success');

    return {
      total_time_ms: successful?.time_ms || null,
      successful_time_ms: successful?.time_ms || null,
      failed_attempts: failed.length,
      failed_attempts_details: failed.map(f => ({ 
        target: f.target_ip, 
        time_ms: f.time_ms, 
        result: f.result 
      }))
    };
  }

  





  async getTrace(domain, recordType = 'A') {
    const traceResult = await this.trace(domain, recordType);
    
    if (!traceResult.success) {
      return traceResult;
    }
    
    const visualStages = this.formatForVisualization(traceResult.stages);
    const structuredExport = this.generateStructuredExport(traceResult);
    
    return {
      success: true,
      domain,
      recordType,
      stages: traceResult.stages, 
      visualStages, 
      structuredExport, 
      errors: traceResult.errors, 
      totalTime: traceResult.totalTime,
      totalStages: visualStages.length,
      timestamp: traceResult.timestamp,
      isLive: true,
      rawOutput: traceResult.rawOutput
    };
  }
}

module.exports = LiveDNSTracer;
