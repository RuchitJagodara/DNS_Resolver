









const dgram = require('dgram');
const dnsPacket = require('dns-packet');



const SERVER_INFO = {
  '198.41.0.4': { name: 'a.root-servers.net', type: 'Root' },
  '199.9.14.201': { name: 'b.root-servers.net', type: 'Root' },
  '192.33.4.12': { name: 'c.root-servers.net', type: 'Root' },
  '199.7.91.13': { name: 'd.root-servers.net', type: 'Root' },
  '192.203.230.10': { name: 'e.root-servers.net', type: 'Root' },
  '192.5.5.241': { name: 'f.root-servers.net', type: 'Root' },
  '192.112.36.4': { name: 'g.root-servers.net', type: 'Root' },
  '198.97.190.53': { name: 'h.root-servers.net', type: 'Root' },
  '192.36.148.17': { name: 'i.root-servers.net', type: 'Root' },
  '192.58.128.30': { name: 'j.root-servers.net', type: 'Root' },
  '193.0.14.129': { name: 'k.root-servers.net', type: 'Root' },
  '199.7.83.42': { name: 'l.root-servers.net', type: 'Root' },
  '202.12.27.33': { name: 'm.root-servers.net', type: 'Root' },
  
  '192.41.162.30': { name: 'a.gtld-servers.net', type: 'TLD (.com)' },
  
  '192.41.162.30': { name: 'a.gtld-servers.net', type: 'TLD (.com)' },
  
  '8.8.8.8': { name: 'Google Public DNS', type: 'Recursive' },
  '1.1.1.1': { name: 'Cloudflare DNS', type: 'Recursive' },
};

const ROOT_SERVERS = [{ ip: '198.41.0.4', name: 'a.root-servers.net', type: 'Root' }];

const RECORD_TYPES_REV = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA',
};

class LiveDNSTracer {
  constructor() {
    this.steps = [];
    this.totalTime = 0;
    this.cache = new Map(); 
    this.queryId = 1; 
  }

  


  getServerInfo(ip, type = 'Unknown') {
    if (SERVER_INFO[ip]) {
      return { ...SERVER_INFO[ip], ip };
    }
    
    for (const [name, cachedIp] of this.cache.entries()) {
      if (cachedIp === ip) {
        return { name, ip, type };
      }
    }
    return { name: `Server (${ip})`, ip, type };
  }

  


  async resolve(domain, recordType = 'A', mode = 'iterative', resolverIp = '8.8.8.8') {
    this.steps = [];
    this.totalTime = 0;
    this.cache.clear();
    const startTime = Date.now();
    this.queryId = 1;

    try {
      let finalAnswer = null;
      if (mode === 'iterative') {
        const rootServer = ROOT_SERVERS[0];
        finalAnswer = await this.traceIterative(domain, recordType, rootServer.ip, rootServer.type);
      } else {
        finalAnswer = await this.traceRecursive(domain, recordType, resolverIp);
      }

      this.totalTime = Date.now() - startTime;
      return {
        success: true,
        domain, recordType, mode,
        answer: finalAnswer,
        steps: this.steps,
        totalTime: this.totalTime,
      };

    } catch (error) {
      
      
      this.totalTime = Date.now() - startTime;
      
      
      if (!this.steps.find(s => s.error)) {
        this.addStep({
          stage: 'error',
          name: 'Resolution Failed',
          explanation: `The resolution process failed unexpectedly. This often indicates a network issue or a problem with the first server in the chain (e.g., the root server).`,
          error: error.message,
          timing: 0,
        });
      }
      
      return {
        success: false,
        domain, recordType, mode,
        error: error.message,
        steps: this.steps,
        totalTime: this.totalTime,
      };
    }
  }

  


  async traceIterative(domain, recordType, serverIp, serverType) {
    const stepStart = Date.now();
    const server = this.getServerInfo(serverIp, serverType);
    const query = { domain, type: recordType, class: 'IN', recursionDesired: false };
    const queryNumber = this.queryId++;

    
    this.addStep({
      stage: `${serverType.toLowerCase()}_query`, 
      name: `(${queryNumber}) Querying ${server.type} Server`,
      messageType: 'QUERY',
      explanation: `To find the ${recordType} record for '${domain}', the client must first ask a ${server.type} server where to go next. Sending a non-recursive query to ${server.name} (${server.ip}).`,
      server: server,
      query: query,
      timing: 0, 
    });

    let response;
    try {
      
      response = await this.sendQuery(domain, recordType, serverIp, false);
    } catch (error) {
      
      const timing = Date.now() - stepStart;
      this.addStep({
        stage: 'error',
        name: `(${queryNumber}) Query Failed`,
        messageType: 'RESPONSE', 
        explanation: `The query sent to ${server.name} (${server.ip}) failed. This is most likely due to a network timeout, meaning the server did not respond in time.`,
        server: server,
        query: query,
        error: error.message,
        timing: timing,
      });
      throw error; 
    }
    
    const timing = Date.now() - stepStart;
    const cname = response.answers.find(a => a.type === 'CNAME');
    const answers = response.answers.filter(a => a.type === recordType.toUpperCase());

    

    
    if (answers.length > 0) {
      this.addStep({
        stage: 'authoritative_server',
        name: `(${queryNumber}) Authoritative Answer`,
        messageType: 'RESPONSE',
        explanation: `✅ Success! The authoritative server ${server.name} (${server.ip}) returned the final answer.`,
        server: server,
        query: query,
        response: {
          found: true,
          records: response.answers, 
          authoritative: true,
          packet: response,
        },
        timing: timing,
      });
      return response.answers;
    }

    
    if (cname) {
      this.addStep({
        stage: 'cname_referral',
        name: `(${queryNumber}) CNAME Referral`,
        messageType: 'RESPONSE',
        explanation: `👉 The server ${server.name} responded with a CNAME record. This means '${domain}' is just an alias for '${cname.data}'. The entire resolution process must restart for the new name.`,
        server: server,
        query: query,
        response: {
          found: true, 
          records: response.answers,
          cname: cname.data,
          packet: response,
        },
        timing: timing,
      });
      
      const rootServer = ROOT_SERVERS[0];
      return this.traceIterative(cname.data, recordType, rootServer.ip, rootServer.type);
    }

    
    const referrals = response.authorities.filter(a => a.type === 'NS');
    if (referrals.length > 0) {
      const nextServerType = (serverType === 'Root') ? 'TLD' : 'Authoritative';
      const glueRecords = response.additionals.filter(a => (a.type === 'A' || a.type === 'AAAA'));

      this.addStep({
        stage: `${nextServerType.toLowerCase()}_referral`, 
        name: `(${queryNumber}) Referral from ${server.type} Server`,
        messageType: 'RESPONSE',
        explanation: `The ${server.type} server doesn't have the final answer. Instead, it referred us to the ${nextServerType} nameservers that are responsible for the next part of the domain.`,
        server: server,
        query: query,
        response: {
          found: false,
          referral: true,
          nameservers: referrals.map(r => r.data),
          glueRecords: glueRecords.map(g => ({ name: g.name, ip: g.data })),
          packet: response,
        },
        timing: timing,
      });

      
      let nextServerIp = null;
      let nextServerName = null;

      for (const ns of referrals) {
        nextServerName = ns.data;
        const glue = glueRecords.find(a => a.name === nextServerName && a.type === 'A'); 
        if (glue) {
          nextServerIp = glue.data;
          this.cache.set(nextServerName, nextServerIp); 
          break;
        }
      }

      
      if (!nextServerIp) {
        nextServerName = referrals[0].data; 
        
        if (this.cache.has(nextServerName)) {
          nextServerIp = this.cache.get(nextServerName);
        } else {
          
          this.addStep({
            stage: 'glue_resolve_start',
            name: `Glue Lookup Started`,
            explanation: `ℹ️ The server referred us to '${nextServerName}' but did not provide its IP address (a "glue record"). We must perform a *new* full DNS query (starting from the root) just to find the IP of this nameserver.`,
            timing: 0,
          });
          
          try {
            const rootServer = ROOT_SERVERS[0];
            
            const glueAnswers = await this.traceIterative(nextServerName, 'A', rootServer.ip, rootServer.type);
            
            if (!glueAnswers || glueAnswers.length === 0) {
              throw new Error(`No 'A' records found for nameserver '${nextServerName}'`);
            }
            
            nextServerIp = glueAnswers.find(a => a.type === 'A')?.data;
            if (!nextServerIp) {
              throw new Error(`Glue resolution for '${nextServerName}' returned answers, but none were 'A' records.`);
            }

            this.cache.set(nextServerName, nextServerIp); 
            this.addStep({
              stage: 'glue_resolve_success',
              name: `Glue Lookup Success`,
              explanation: `✅ Glue lookup for '${nextServerName}' succeeded. Its IP is ${nextServerIp}. Now we can resume the original query.`,
              response: { records: glueAnswers },
              timing: 0, 
            });

          } catch (error) {
            
            this.addStep({
              stage: 'error',
              name: `Glue Lookup Failed`,
              explanation: `❌ CRITICAL FAILURE: The query for the *nameserver* '${nextServerName}' failed. We cannot proceed with the original query for '${domain}' because we don't know the IP of the next server.`,
              error: error.message,
              timing: 0,
            });
            throw error; 
          }
        }
      }

      
      return this.traceIterative(domain, recordType, nextServerIp, nextServerType);
    }
    
    
    const soa = response.authorities.find(a => a.type === 'SOA');
    if (soa) {
         const code = response.flags.rcode;
         this.addStep({
            stage: 'authoritative_server',
            name: `(${queryNumber}) Authoritative Response (${code})`,
            messageType: 'RESPONSE',
            explanation: code === 'NXDOMAIN'
              ? `❌ The authoritative server ${server.name} responded with NXDOMAIN (Non-Existent Domain). This domain does not exist.`
              : `✅ The authoritative server ${server.name} responded with NOERROR, but no ${recordType} records were found for this domain.`,
            server: server,
            query: query,
            response: {
              found: false,
              records: [],
              rcode: code,
              packet: response,
            },
            timing: timing,
         });
         
         if (code === 'NXDOMAIN') {
            throw new Error(`Domain not found (NXDOMAIN) by ${server.name}`);
         }
         return []; 
    }

    
    const unknownError = new Error(`Unknown DNS response from ${server.ip}`);
    this.addStep({
      stage: 'error',
      name: `(${queryNumber}) Unknown Response`,
      explanation: `The server ${server.name} returned a response that the tracer could not understand (no answer, no referral, no SOA).`,
      server: server,
      query: query,
      error: unknownError.message,
      response: { packet: response },
      timing: timing,
    });
    throw unknownError;
  }

  


  async traceRecursive(domain, recordType, resolverIp) {
    const stepStart = Date.now();
    const server = this.getServerInfo(resolverIp, 'Recursive');
    const query = { domain, type: recordType, class: 'IN', recursionDesired: true };
    const queryNumber = this.queryId++;

    
    this.addStep({
      stage: 'recursive_query',
      name: `(${queryNumber}) Querying Recursive Resolver`,
      messageType: 'QUERY',
      explanation: `The client is sending a *recursive* query to ${server.name} (${server.ip}). This resolver will now perform the full iterative process (querying root, TLD, etc.) on our behalf and return only the final answer.`,
      server: server,
      query: query,
      timing: 0, 
    });
    
    let response;
    try {
      
      response = await this.sendQuery(domain, recordType, serverIp, true);
    } catch (error) {
      
      const timing = Date.now() - stepStart;
      this.addStep({
        stage: 'error',
        name: `(${queryNumber}) Query Failed`,
        messageType: 'RESPONSE',
        explanation: `The query sent to the recursive resolver ${server.name} (${server.ip}) failed. This is most likely due to a network timeout.`,
        server: server,
        query: query,
        error: error.message,
        timing: timing,
      });
      throw error; 
    }
    
    const timing = Date.now() - stepStart;
    const answers = response.answers;

    
    if (answers.length > 0) {
      this.addStep({
        stage: 'recursive_answer',
        name: `(${queryNumber}) Recursive Answer Received`,
        messageType: 'RESPONSE',
        explanation: `✅ Success! The recursive resolver ${server.name} completed its process and returned the final answer(s).`,
        server: server,
        query: query,
        response: {
          found: true,
          records: answers,
          authoritative: response.flags.aa,
          packet: response,
        },
        timing: timing,
      });
      return answers;
    }

    
    const code = response.flags.rcode;
    this.addStep({
      stage: 'recursive_answer',
      name: `(${queryNumber}) Recursive Response (${code})`,
      messageType: 'RESPONSE',
      explanation: code === 'NXDOMAIN'
        ? `❌ The recursive resolver ${server.name} responded with NXDOMAIN (Non-Existent Domain).`
        : `✅ The recursive resolver ${server.name} responded with NOERROR, but no ${recordType} records were found.`,
      server: server,
      query: query,
      response: {
        found: false,
        records: [],
        rcode: code,
        packet: response,
      },
      timing: timing,
    });
    
    if (code === 'NXDOMAIN') {
      throw new Error(`Domain not found (NXDOMAIN) by ${server.name}`);
    }
    return [];
  }

  


  sendQuery(name, type, serverIp, recursionDesired = false, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const queryType = type.toUpperCase();
      const buf = dnsPacket.encode({
        type: 'query',
        id: Math.floor(Math.random() * 65535),
        flags: recursionDesired ? dnsPacket.RECURSION_DESIRED : 0,
        questions: [{
          type: queryType,
          class: 'IN',
          name: name
        }]
      });

      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`DNS query for ${name} (${queryType}) @ ${serverIp} timed out after ${timeout}ms`));
      }, timeout);

      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.close();
        reject(new Error(`Socket error: ${err.message}`));
      });

      socket.on('message', (msg) => {
        clearTimeout(timer);
        socket.close();
        try {
          const decoded = dnsPacket.decode(msg);
          const normalize = (r) => ({
             ...r,
             type: RECORD_TYPES_REV[r.type] || r.type,
          });
          decoded.answers = decoded.answers.map(normalize);
          decoded.authorities = decoded.authorities.map(normalize);
          decoded.additionals = decoded.additionals.map(normalize);
          resolve(decoded);
        } catch (err) {
          reject(new Error(`Failed to decode DNS packet: ${err.message}`));
        }
      });

      socket.send(buf, 0, buf.length, 53, serverIp);
    });
  }

  


  addStep(data) {
    this.steps.push({
      
      name: 'Unknown Step',
      stage: 'unknown',
      messageType: 'INFO',
      explanation: '',
      ...data,
    });
  }
}


module.exports = LiveDNSTracer;