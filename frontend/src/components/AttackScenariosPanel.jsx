import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/AttackScenariosPanel.css';

function AttackScenariosPanel({ onClose }) {
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [showBrief, setShowBrief] = useState(false); 
  const [simulationStep, setSimulationStep] = useState(0);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [showPacketModal, setShowPacketModal] = useState(false);
  const [modifiedPacketData, setModifiedPacketData] = useState(null);
  const [interceptionPhase, setInterceptionPhase] = useState(0); 
  const [selectedNode, setSelectedNode] = useState(null); 
  const svgRef = useRef(null);

  const attacks = [
    {
      id: 'cache-poisoning',
      name: 'DNS Cache Poisoning (Kaminsky-Style Attack)',
      icon: '💉',
      severity: 'Critical',
      description: '⚠️ HISTORICAL ATTACK (2008): Advanced race condition exploit where attacker floods DNS resolver with forged responses. Modern DNS has mitigations (DNSSEC, port randomization, DoH) that prevent this attack.',
      difficulty: 'Hard (2008) → Nearly Impossible (2024)',
      impact: 'Historical Impact: Mass phishing - thousands of users redirected to malicious sites for 24+ hours. Modern Impact: Prevented by DNSSEC + encrypted DNS',
      realWorldExample: 'CVE-2008-1447: Dan Kaminsky discovered this affecting ALL DNS servers globally. Emergency patch deployed worldwide. Modern DNS (2024) uses DNSSEC + source port randomization + DNS-over-HTTPS to prevent this attack.',
      color: '#ef4444',
      historicalNote: true
    },
    {
      id: 'mitm',
      name: 'Man-in-the-Middle (Evil Twin)',
      icon: '🕵️',
      severity: 'High',
      description: 'Rogue WiFi access point intercepts all DNS traffic, returns malicious IP addresses',
      difficulty: 'Easy',
      impact: 'Credential theft, session hijacking, banking fraud on public WiFi networks',
      realWorldExample: 'Common at airports, hotels, coffee shops. Attackers set up "Free_WiFi" access points',
      color: '#f59e0b'
    },
    {
      id: 'amplification',
      name: 'DNS Amplification DDoS',
      icon: '💥',
      severity: 'Critical',
      description: 'Exploits open DNS resolvers to amplify attack traffic 100x using IP spoofing',
      difficulty: 'Easy',
      impact: 'Terabit-scale DDoS attacks - complete network saturation and service outage',
      realWorldExample: '2018: GitHub hit with 1.35 Tbps attack. 2016: Dyn DNS outage (Netflix, Twitter, Reddit down)',
      color: '#dc2626'
    },
    {
      id: 'tunneling',
      name: 'DNS Tunneling (C2 Channel)',
      icon: '🚇',
      severity: 'High',
      description: 'Encodes data/commands in DNS queries/responses to bypass firewalls and exfiltrate data',
      difficulty: 'Hard',
      impact: 'Covert malware C2 communication, data exfiltration undetected for months',
      realWorldExample: 'APT groups use tools like Iodine, DNSCat2, Cobalt Strike. Detected in SolarWinds breach',
      color: '#8b5cf6'
    },
    {
      id: 'nxdomain-flood',
      name: 'NXDOMAIN Flood Attack',
      icon: '🌊',
      severity: 'High',
      description: 'Floods DNS servers with millions of queries for random non-existent domains',
      difficulty: 'Easy',
      impact: 'DNS infrastructure collapse - all internet services fail for affected users',
      realWorldExample: '2016: Mirai botnet NXDOMAIN flood on Dyn. 2021: REvil ransomware group DDoS attacks',
      color: '#3b82f6'
    },
    {
      id: 'subdomain-takeover',
      name: 'Subdomain Takeover',
      icon: '🎯',
      severity: 'Medium',
      description: 'Exploits dangling DNS CNAME records pointing to unclaimed cloud resources',
      difficulty: 'Medium',
      impact: 'Phishing on trusted domains, malware distribution, reputation damage',
      realWorldExample: 'Found on Uber, Shopify, Tesla, Microsoft subdomains. Common bug bounty finding',
      color: '#10b981'
    }
  ];

  useEffect(() => {
    if (selectedAttack && !showBrief && svgRef.current) {
      drawAttackVisualization();
    }
  }, [selectedAttack, simulationStep, interceptionPhase, showBrief]);

  const getPacketData = (attackId, step, nodeId) => {
    
    const packetTemplates = {
      'cache-poisoning': {
        1: {
          'attacker': {
            before: {
              type: 'Attack Planning Phase',
              description: 'Attacker prepares Kaminsky-style cache poisoning attack',
              status: 'Reconnaissance complete',
              target: 'DNS Resolver at 8.8.8.8',
              domain: 'target.com',
              strategy: 'Random subdomain queries to bypass cache',
              secure: false
            },
            after: {
              type: 'Kaminsky Query Sent',
              transactionID: 'Unknown to attacker (will be guessed)',
              flags: { QR: 0, AA: 0, RD: 1 },
              question: { 
                name: 'random12345.target.com', 
                type: 'A', 
                class: 'IN',
                strategy: 'Random subdomain prevents cache hit'
              },
              destination: 'DNS Resolver (8.8.8.8)',
              sourceIP: '203.0.113.25 (Attacker or spoofed client)',
              kaminskySrategy: '✓ Query random subdomain → forces resolver to query auth server',
              timing: 'Resolver will generate random TXID + source port',
              attackWindow: 'RTT to auth server: ~50-500ms to inject forged responses',
              nextStep: 'Prepare flood of forged responses',
              status: 'Query sent - waiting for resolver to query auth server',
              danger: true
            }
          },
          'resolver': {
            before: {
              type: 'Idle State',
              cache: 'Clean (no poison)',
              status: 'Processing normal queries',
              vulnerability: 'No DNSSEC validation enabled'
            },
            after: {
              type: 'Query Received - Cache MISS',
              transactionID: 'Will generate random TXID (16-bit)',
              question: { name: 'random12345.target.com', type: 'A' },
              cacheStatus: 'MISS - Domain never queried before',
              action: 'Must query authoritative server',
              randomization: {
                txid: '16 bits entropy (65,536 combinations)',
                sourcePort: '16 bits entropy (65,536 combinations)',
                total: '32 bits = 4,294,967,296 combinations'
              },
              status: 'Generating random TXID and source port...',
              nextStep: 'Query authoritative nameserver for target.com',
              vulnerability: '⚠️ Race condition window opening!'
            }
          }
        },
        2: {
          'resolver': {
            before: {
              type: 'Preparing Recursive Query',
              domain: 'random12345.target.com',
              cacheStatus: 'MISS',
              mustQuery: 'Authoritative server'
            },
            after: {
              type: 'Recursive Query Sent to Auth Server',
              transactionID: '0x1a2b (Random 16-bit)',
              flags: { QR: 0, AA: 0, RD: 1 },
              question: { name: 'random12345.target.com', type: 'A', class: 'IN' },
              sourceIP: '8.8.8.8 (Resolver)',
              sourcePort: '54321 (Random ephemeral port 1024-65535)',
              destinationIP: '198.41.0.4 (Auth server for target.com)',
              destinationPort: '53',
              protocol: 'UDP (connectionless - allows IP spoofing)',
              entropy: {
                transactionID: '0x1a2b (1 of 65,536)',
                sourcePort: '54321 (1 of 65,536)',
                totalCombinations: '4,294,967,296'
              },
              timing: {
                sent: '2024-11-11 14:32:17.123 UTC',
                expectedRTT: '50-500ms',
                raceWindow: 'OPEN - Attacker can flood during this window'
              },
              vulnerability: '🔴 CRITICAL: First matching response (TXID + port) wins!',
              status: 'Waiting for authoritative response...',
              warning: 'If forged response arrives first → POISONED!'
            }
          },
          'auth-server': {
            before: {
              type: 'Idle State',
              status: 'Waiting for queries',
              domain: 'Authoritative for target.com'
            },
            after: {
              type: 'Query Received',
              transactionID: '0x1a2b',
              question: { name: 'random12345.target.com', type: 'A' },
              lookupStatus: 'Checking zone records...',
              expectedResult: 'NXDOMAIN (subdomain doesn\'t exist)',
              responseTime: '~50-500ms (network latency)',
              status: 'Processing query, preparing response',
              note: 'Response will arrive at resolver in ~100-200ms'
            }
          }
        },
        3: {
          'attacker': {
            before: {
              type: 'Monitoring Network',
              status: 'Detected resolver query to auth server',
              knownInfo: {
                domain: 'random12345.target.com',
                resolverIP: '8.8.8.8',
                authServerIP: '198.41.0.4'
              },
              unknownInfo: {
                txid: '??? (16-bit random - must guess)',
                sourcePort: '??? (16-bit random - must guess)'
              },
              strategy: 'Flood with forged responses - brute-force TXID + port'
            },
            after: {
              type: 'Kaminsky Flood Attack ACTIVE',
              floodRate: '10,000 forged packets/second',
              attempts: [
                'Attempt #1: TXID=0x0000, Port=54321 → DROPPED',
                'Attempt #2: TXID=0x0001, Port=54321 → DROPPED',
                '...',
                'Attempt #6827: TXID=0x1a2b, Port=54321 → ✅ MATCH!',
              ],
              successfulPacket: {
                transactionID: '0x1a2b (✓ GUESSED CORRECTLY!)',
                sourceIP: '198.41.0.4 (SPOOFED - auth server)',
                sourcePort: '53',
                destinationIP: '8.8.8.8 (Resolver)',
                destinationPort: '54321 (✓ GUESSED CORRECTLY!)',
                answer: { name: 'random12345.target.com', type: 'A', data: '6.6.6.6' },
                additionalRecords: [
                  {
                    name: 'target.com',
                    type: 'NS',
                    ttl: 86400,
                    data: 'ns.evil.com',
                    impact: '🔴 THIS IS THE POISON!'
                  },
                  {
                    name: 'ns.evil.com',
                    type: 'A',
                    ttl: 86400,
                    data: '6.6.6.6',
                    impact: 'Glue record - attacker nameserver'
                  }
                ]
              },
              timing: 'Arrived 10ms BEFORE legitimate response',
              result: '✅ ACCEPTED & CACHED by resolver',
              attackSuccess: true,
              danger: true,
              warning: '💀 CACHE POISONING SUCCESSFUL!',
              impact: 'Entire target.com domain hijacked for 24 hours'
            }
          },
          'resolver': {
            before: {
              type: 'Waiting for Auth Server Response',
              query: 'random12345.target.com',
              transactionID: '0x1a2b',
              sourcePort: '54321',
              expectedFrom: '198.41.0.4:53 (Auth server)',
              timeElapsed: '50ms',
              receivedResponses: 0
            },
            after: {
              type: 'Response Received FIRST (FORGED!)',
              transactionID: '0x1a2b (✓ MATCH)',
              sourceIP: '198.41.0.4 (Appears legitimate - actually spoofed)',
              sourcePort: '53 (✓ Correct)',
              destinationPort: '54321 (✓ MATCH)',
              validation: {
                txidCheck: '✓ MATCH (0x1a2b)',
                portCheck: '✓ MATCH (54321)',
                ipCheck: '✓ MATCH (198.41.0.4)',
                timing: '✓ First response received'
              },
              decision: 'ACCEPT - All checks passed (but was forged!)',
              cachedRecords: [
                {
                  record: 'random12345.target.com A 6.6.6.6',
                  ttl: 300,
                  poisoned: false,
                  note: 'Ignored by users (random subdomain)'
                },
                {
                  record: 'target.com NS ns.evil.com',
                  ttl: 86400,
                  poisoned: true,
                  impact: '🔴 CRITICAL - Entire domain poisoned!'
                },
                {
                  record: 'ns.evil.com A 6.6.6.6',
                  ttl: 86400,
                  poisoned: true,
                  impact: 'Glue record - points to attacker'
                }
              ],
              cacheExpiry: '2024-11-12 14:32:17 UTC (24 hours)',
              warning: '⚠️ POISONED CACHE - All target.com queries affected!',
              danger: true,
              impact: 'ALL users querying this resolver compromised for 24 hours'
            }
          },
          'auth-server': {
            before: {
              type: 'Processing Query',
              query: 'random12345.target.com',
              status: 'Preparing NXDOMAIN response'
            },
            after: {
              type: 'Legitimate Response Sent (Too Late)',
              transactionID: '0x1a2b',
              answer: 'NXDOMAIN (Domain doesn\'t exist)',
              timing: 'Arrived 10ms AFTER forged response',
              status: 'IGNORED by resolver (duplicate response)',
              result: '❌ DISCARDED',
              explanation: 'Resolver already answered query with forged data',
              attackerWon: true,
              note: 'Legitimate server did nothing wrong - just lost the race'
            }
          }
        },
        4: {
          'resolver': {
            before: {
              type: 'Normal Cache State',
              cached: 'Various legitimate DNS records',
              forDomain: 'target.com',
              status: 'Recently poisoned (Step 3)',
              poisonedRecords: [
                'target.com NS ns.evil.com (TTL: 86400s)',
                'ns.evil.com A 6.6.6.6 (TTL: 86400s)'
              ]
            },
            after: {
              type: 'Serving Poisoned Records',
              query: 'www.target.com (from legitimate user)',
              resolutionProcess: [
                '1. User queries: www.target.com',
                '2. Resolver checks cache: target.com NS → ns.evil.com (POISONED)',
                '3. Resolver queries ns.evil.com (6.6.6.6) for www.target.com',
                '4. Attacker\'s nameserver (6.6.6.6) returns: 6.6.6.6',
                '5. Resolver caches and returns: 6.6.6.6'
              ],
              cachedAnswer: {
                domain: 'www.target.com',
                type: 'A',
                data: '6.6.6.6 (ATTACKER IP)',
                ttl: 86395,
                source: 'Poisoned NS record lookup'
              },
              poisoned: true,
              affectedDomains: [
                'www.target.com',
                'mail.target.com',
                'api.target.com',
                'cdn.target.com',
                'ANY subdomain of target.com'
              ],
              cacheRemaining: '86395 seconds (23h 59m 55s)',
              danger: true,
              warning: '💀 ALL subdomains redirected to attacker!',
              impact: 'Every user querying target.com/* gets attacker IP'
            }
          },
          'client': {
            before: {
              type: 'Normal User Activity',
              action: 'User types www.target.com in browser',
              expecting: 'Legitimate website',
              trustLevel: 'HIGH (user trusts domain)'
            },
            after: {
              type: 'Poisoned Response Received',
              query: 'www.target.com',
              response: {
                ip: '6.6.6.6 (ATTACKER IP)',
                legitimateIP: '93.184.216.34 (Real server - never reached)',
                ttl: 86395
              },
              userAction: 'Browser connects to 6.6.6.6',
              attackerServer: {
                ip: '6.6.6.6',
                content: 'Pixel-perfect phishing copy of target.com',
                sslCert: 'Self-signed or Let\'s Encrypt (browser warning)',
                userResponse: 'Often ignored - "just security noise"'
              },
              credentialTheft: {
                username: 'victim@email.com',
                password: '••••••••••• (captured)',
                sessionTokens: 'Cookies, API keys (captured)',
                attackerAction: 'Logs credentials, proxies to real site'
              },
              userAwareness: 'NONE - Attack completely transparent',
              danger: true,
              warning: '🔴 CREDENTIALS STOLEN!',
              impact: 'User account compromised'
            }
          }
        },
        5: {
          'victim': {
            before: {
              type: 'Normal User',
              activity: 'Browsing internet normally',
              trustDNS: 'Implicitly trusts DNS resolver',
              awareness: 'Unaware of cache poisoning'
            },
            after: {
              type: 'Mass Victim #1',
              query: 'www.target.com',
              response: '6.6.6.6 (ATTACKER)',
              userJourney: [
                '1. Types www.target.com in browser',
                '2. DNS returns 6.6.6.6 (poisoned)',
                '3. Browser connects to attacker server',
                '4. Sees fake login page',
                '5. Enters credentials → STOLEN',
                '6. Redirected to real site (via proxy)',
                '7. Never suspects compromise'
              ],
              impacted: true,
              danger: true
            }
          },
          'resolver': {
            before: {
              type: 'Poisoned Cache Active',
              cachedRecords: 'target.com NS ns.evil.com',
              ttlRemaining: '86340 seconds',
              victimCount: '1 (more incoming)'
            },
            after: {
              type: 'Mass Poisoning Event',
              totalQueries: '1,000+ queries in 1 hour',
              uniqueVictims: '1,000-10,000 users',
              queriedDomains: [
                'www.target.com (650 queries)',
                'mail.target.com (180 queries)',
                'api.target.com (95 queries)',
                'shop.target.com (75 queries)'
              ],
              allRedirected: true,
              stolenCredentials: 'Hundreds of accounts',
              attackDuration: '24 hours (until cache expires)',
              persistence: 'Attacker can re-poison after expiry',
              realWorldAnalog: 'CVE-2008-1447 affected millions globally',
              mitigationRequired: [
                '✓ Flush DNS cache immediately',
                '✓ Enable DNSSEC validation',
                '✓ Source port randomization (RFC 5452)',
                '✓ 0x20 encoding',
                '✓ DNS-over-HTTPS (DoH)',
                '✓ Monitor NS record changes'
              ],
              danger: true,
              warning: '💀 CRITICAL: Mass phishing attack in progress!',
              impact: 'Thousands of users compromised'
            }
          }
        }
      },
      'mitm': {
        1: {
          'client': {
            before: {
              type: 'Normal State',
              connection: 'None',
              dnsServer: 'Unknown'
            },
            after: {
              type: 'Connected to WiFi',
              network: 'Free Public WiFi',
              dnsServer: 'Assigned by WiFi',
              status: 'Connected',
              warning: 'DNS server controlled by WiFi owner'
            }
          }
        },
        2: {
          'client': {
            before: {
              type: 'Normal DNS Query',
              domain: 'facebook.com',
              via: 'WiFi network'
            },
            after: {
              type: 'Query Sent',
              transactionID: '0xabcd',
              question: { name: 'facebook.com', type: 'A' },
              via: 'WiFi Hotspot',
              destination: 'DNS Server (via WiFi)',
              status: 'Query transmitted'
            }
          },
          'attacker': {
            before: {
              type: 'Monitoring WiFi',
              status: 'Intercepting all DNS traffic',
              method: 'WiFi owner privilege'
            },
            after: {
              type: 'Query INTERCEPTED',
              transactionID: '0xabcd',
              question: 'facebook.com',
              clientIP: '192.168.1.105',
              status: 'Query captured',
              action: 'Will send fake response',
              danger: true
            }
          }
        },
        3: {
          'attacker': {
            before: {
              type: 'Intercepted Query',
              query: 'facebook.com',
              clientIP: '192.168.1.105',
              transactionID: '0xabcd'
            },
            after: {
              type: 'Preparing Fake Response',
              transactionID: '0xabcd',
              realIP: '157.240.229.35',
              fakeIP: '10.0.0.66 (Attacker\'s server)',
              status: 'Will block real DNS response',
              danger: true
            }
          }
        },
        4: {
          'attacker': {
            before: {
              type: 'Fake Response Ready',
              fakeIP: '10.0.0.66'
            },
            after: {
              type: 'Fake Response SENT',
              transactionID: '0xabcd',
              flags: { QR: 1, AA: 1 },
              answer: { 
                name: 'facebook.com', 
                type: 'A', 
                data: '10.0.0.66 ⚠️ FAKE' 
              },
              realIP: '157.240.229.35 (blocked)',
              danger: true,
              impact: 'Client will connect to fake server!'
            }
          },
          'client': {
            before: {
              type: 'Waiting for DNS Response',
              query: 'facebook.com',
              expecting: 'Real Facebook IP'
            },
            after: {
              type: 'Response Received',
              domain: 'facebook.com',
              ip: '10.0.0.66',
              realIP: '157.240.229.35 (never received)',
              willConnectTo: 'Attacker\'s phishing site',
              danger: true,
              impact: 'Credentials will be stolen!'
            }
          }
        }
      },
      'amplification': {
        1: {
          'attacker': {
            before: {
              type: 'Planning Attack',
              target: 'Victim at 203.0.113.50',
              method: 'DNS Amplification'
            },
            after: {
              type: 'Found Open Resolver',
              resolver: 'Open DNS resolver',
              amplification: 'Up to 50x possible',
              status: 'Ready to send spoofed queries'
            }
          }
        },
        2: {
          'attacker': {
            before: {
              type: 'Normal IP',
              realIP: '198.51.100.25',
              packet: 'Not yet sent'
            },
            after: {
              type: 'Spoofed Query SENT',
              transactionID: '0x9999',
              sourceIP: '203.0.113.50 ⚠️ SPOOFED (Victim)',
              realSourceIP: '198.51.100.25 (Hidden)',
              question: { name: 'isc.org', type: 'ANY' },
              querySize: '60 bytes',
              danger: true,
              impact: 'Response will go to victim!'
            }
          },
          'resolver': {
            before: {
              type: 'Idle',
              status: 'Waiting for queries'
            },
            after: {
              type: 'Query Received',
              sourceIP: '203.0.113.50 (believes this is real)',
              question: { name: 'isc.org', type: 'ANY' },
              querySize: '60 bytes',
              willRespondTo: 'Victim IP',
              responseSize: '~4000 bytes',
              warning: 'Source IP cannot be verified (UDP)'
            }
          }
        },
        3: {
          'resolver': {
            before: {
              type: 'Processing Query',
              query: 'isc.org (ANY type)',
              responseSize: 'Calculating...'
            },
            after: {
              type: 'Large Response SENT',
              destinationIP: '203.0.113.50 (Victim)',
              responseSize: '4000 bytes',
              amplificationFactor: '50x (4000 ÷ 60)',
              records: 'ALL DNS records for isc.org',
              danger: true,
              impact: 'Victim receiving massive traffic'
            }
          },
          'victim': {
            before: {
              type: 'Normal Operation',
              traffic: 'Normal levels',
              dnsQueries: 'None sent'
            },
            after: {
              type: 'Under ATTACK',
              receivedSize: '4000 bytes',
              expectedSize: '0 bytes (did NOT send query!)',
              status: 'Receiving unsolicited DNS responses',
              multipliedBy: '1000s of DNS servers',
              totalBandwidth: '50 Gbps+ incoming',
              danger: true,
              impact: 'Network saturated - DDoS in progress!'
            }
          }
        }
      }
    };

    return packetTemplates[attackId]?.[step]?.[nodeId] || null;
  };

  const getAttackImpact = (attackId, step) => {
    const impacts = {
      'cache-poisoning': {
        3: {
          title: 'Kaminsky Race Condition - Attack in Progress',
          changes: [
            { 
              field: 'Transaction ID', 
              before: 'Unknown to attacker (random 16-bit)', 
              after: '0x1a2b (Successfully guessed via flood!)', 
              dangerous: true 
            },
            { 
              field: 'Source Port', 
              before: 'Unknown to attacker (random ephemeral)', 
              after: '54321 (Successfully guessed!)', 
              dangerous: true 
            },
            { 
              field: 'Source IP', 
              before: 'Legitimate auth server (198.41.0.4)', 
              after: '198.41.0.4 (SPOOFED by attacker)', 
              dangerous: true 
            },
            { 
              field: 'Answer Section', 
              before: 'Waiting for NXDOMAIN from auth server...', 
              after: 'random12345.target.com A 6.6.6.6 (Decoy)', 
              dangerous: false 
            },
            { 
              field: 'Additional Section (NS Record)', 
              before: 'None', 
              after: 'target.com NS ns.evil.com (TTL: 86400s)', 
              dangerous: true 
            },
            { 
              field: 'Additional Section (Glue Record)', 
              before: 'None', 
              after: 'ns.evil.com A 6.6.6.6 (Attacker IP)', 
              dangerous: true 
            },
            { 
              field: 'Response Timing', 
              before: 'Legitimate: ~100-200ms RTT', 
              after: 'Forged: Arrived 10ms BEFORE legitimate', 
              dangerous: true 
            },
            { 
              field: 'Flood Attack Rate', 
              before: 'N/A', 
              after: '10,000 forged packets/second', 
              dangerous: true 
            },
            { 
              field: 'Probability of Success', 
              before: '~1 in 4.3 billion per packet', 
              after: 'SUCCESS after 6,827 attempts (0.7 seconds)', 
              dangerous: true 
            }
          ],
          risk: 'CRITICAL',
          explanation: '⚡ RACE CONDITION WON! Attacker\'s forged response arrived FIRST with matching TXID (0x1a2b) and source port (54321). Resolver validated spoofed source IP (198.41.0.4) and accepted the response. Critical poisoning: Additional section contains NS record "target.com NS ns.evil.com" which poisons the ENTIRE DOMAIN for 24 hours. Legitimate response arrived 10ms later but was discarded as duplicate. Cache poisoning successful!',
          technicalDetails: '📊 Attack Statistics:\n• Forged packets sent: 6,827\n• Time to success: 0.68 seconds\n• Attack success rate: 1 in 6,827 (vs theoretical 1 in 4.3B)\n• Kaminsky multiplier: Unlimited attempts via random subdomains\n\n🎯 Why It Worked:\n• UDP = No connection state = IP spoofing possible\n• Resolver accepts first matching response (race!)\n• No DNSSEC validation = Cannot verify cryptographic signatures\n• Additional records (NS + glue) poison entire domain\n• Long TTL (86400s) = 24-hour persistence',
          mitigations: [
            'DNSSEC: Cryptographically sign responses (prevents forgery)',
            'Source Port Randomization (RFC 5452): Use full 16-bit port space',
            '0x20 Encoding: Randomize query capitalization for extra entropy',
            'DNS-over-HTTPS (DoH): Encrypted channel prevents sniffing',
            'Response Rate Limiting (RRL): Slow down flood attacks'
          ]
        },
        4: {
          title: 'Cache Successfully Poisoned - Domain Hijacked',
          changes: [
            { 
              field: 'Cached NS Record', 
              before: 'target.com NS (none/legitimate)', 
              after: 'target.com NS ns.evil.com (TTL: 86400s)', 
              dangerous: true 
            },
            { 
              field: 'Cached Glue Record', 
              before: 'ns.evil.com (unknown)', 
              after: 'ns.evil.com A 6.6.6.6 (Attacker IP)', 
              dangerous: true 
            },
            { 
              field: 'Resolution Path', 
              before: 'target.com → Legitimate nameservers', 
              after: 'target.com → ns.evil.com (6.6.6.6 - Attacker)', 
              dangerous: true 
            },
            { 
              field: 'Affected Subdomains', 
              before: '0 (not poisoned)', 
              after: 'ALL (www, mail, api, cdn, shop, etc.)', 
              dangerous: true 
            },
            { 
              field: 'Affected Users', 
              before: '0', 
              after: 'ALL users querying this resolver', 
              dangerous: true 
            },
            { 
              field: 'Attack Persistence', 
              before: 'N/A', 
              after: '86400 seconds (24 hours) until TTL expires', 
              dangerous: true 
            },
            { 
              field: 'Cache Expiry', 
              before: 'N/A', 
              after: '2024-11-12 14:32:17 UTC (24 hours from now)', 
              dangerous: true 
            },
            { 
              field: 'Detection Difficulty', 
              before: 'N/A', 
              after: 'HIGH - Looks like legitimate DNS response', 
              dangerous: true 
            }
          ],
          risk: 'CATASTROPHIC',
          explanation: '💀 CACHE POISONING COMPLETE! Resolver now has poisoned NS record: "target.com NS ns.evil.com (TTL: 86400s)". This means ALL subdomain queries (www.target.com, mail.target.com, api.target.com, etc.) will be resolved by querying attacker\'s nameserver at 6.6.6.6. Attacker controls DNS responses for the ENTIRE DOMAIN for 24 hours. Users will connect to attacker\'s phishing servers, malware distribution sites, or man-in-the-middle proxies. Attack affects THOUSANDS to MILLIONS of users (depending on resolver scale - ISP DNS vs enterprise DNS). Credentials, payment info, session tokens, API keys all at risk. Attack persists even if attacker disconnects - poisoned cache remains until TTL expires.',
          technicalDetails: '🔴 Impact Assessment:\n\nSCOPE:\n• Domain: target.com (ENTIRE domain hierarchy)\n• Subdomains: ALL (*.target.com)\n• Users: All users querying this resolver\n• Duration: 86400 seconds (24 hours minimum)\n\nATTACK AMPLIFICATION:\n• Original query: random12345.target.com (obscure subdomain)\n• Poisoned data: target.com NS record (ENTIRE DOMAIN!)\n• Leverage: 1 successful query → hijacks all subdomains\n\nVICTIM SCENARIOS:\n1. User queries www.target.com:\n   → Resolver queries ns.evil.com (6.6.6.6)\n   → Attacker returns 6.6.6.6 (phishing server)\n   → User connects to fake site, enters credentials\n   → Credentials stolen\n\n2. User queries mail.target.com:\n   → Same poisoned path → attacker controls email traffic\n\n3. User queries api.target.com:\n   → API keys, auth tokens intercepted\n\nPERSISTENCE:\n• Cache TTL: 86400s (24 hours)\n• Attacker can RE-POISON after expiry (unlimited attempts)\n• Attack can persist for MONTHS if undetected\n\nREAL-WORLD PRECEDENT:\n• CVE-2008-1447: Affected ALL DNS servers globally\n• Required emergency coordinated patch (July 2008)\n• Used against GitHub, PayPal, major banks\n• Estimated millions of users compromised before mitigation',
          urgentActions: [
            '🚨 IMMEDIATE: Flush DNS cache on affected resolver',
            '🚨 IMMEDIATE: Enable DNSSEC validation',
            '🚨 IMMEDIATE: Notify users to clear browser caches',
            '⚠️ URGENT: Implement source port randomization',
            '⚠️ URGENT: Deploy 0x20 encoding',
            '⚠️ URGENT: Monitor for unusual NS record changes',
            '📊 ANALYSIS: Review DNS query logs for random subdomain spikes',
            '📊 ANALYSIS: Check for multiple responses per TXID',
            '🔐 LONG-TERM: Migrate to DNS-over-HTTPS (DoH)',
            '🔐 LONG-TERM: Deploy DNSSEC signing on authoritative servers'
          ]
        }
      },
      'mitm': {
        4: {
          title: 'Man-in-the-Middle Active',
          changes: [
            { field: 'Response Source', before: 'Legitimate DNS', after: 'Attacker WiFi', dangerous: true },
            { field: 'IP Address', before: '157.240.229.35', after: '10.0.0.66', dangerous: true },
            { field: 'Destination', before: 'Real Facebook', after: 'Fake Phishing Site', dangerous: true }
          ],
          risk: 'CRITICAL',
          explanation: 'User will connect to attacker\'s fake site. Credentials will be stolen!'
        }
      },
      'amplification': {
        3: {
          title: 'Traffic Amplification Active',
          changes: [
            { field: 'Query Size', before: '60 bytes', after: '60 bytes', dangerous: false },
            { field: 'Response Size', before: '60 bytes', after: '4000 bytes', dangerous: true },
            { field: 'Amplification', before: '1x', after: '50x', dangerous: true },
            { field: 'Bandwidth', before: '1 Mbps', after: '50 Mbps per server', dangerous: true }
          ],
          risk: 'CRITICAL',
          explanation: 'With 1000 DNS servers, attacker amplifies 1 Mbps to 50 Gbps aimed at victim!'
        }
      }
    };

    return impacts[attackId]?.[step] || null;
  };

  const getAttackSteps = (attackId) => {
    const steps = {
      
      
      'cache-poisoning': [
        { 
          step: 1, 
          title: 'Step 1: Attacker Triggers Resolver Query (⚠️ Historical Attack - 2008)', 
          description: '⚠️ EDUCATIONAL NOTE: This Kaminsky attack is from 2008. Modern DNS (2024) has mitigations (DNSSEC, port randomization, DoH) that prevent this. ATTACK FLOW: Attacker causes resolver to query for random subdomain (random12345.target.com). This prevents cache hits and forces resolver to query authoritative server. Resolver issues query with 16-bit Transaction ID (TXID) and ephemeral source port (adds entropy). Query sent via UDP to authoritative server IP:53.', 
          actors: ['attacker', 'resolver'],
          hasPackets: true,
          technicalDetails: '🛡️ MODERN PROTECTIONS (Why this attack no longer works):\n• DNSSEC: Cryptographic signatures validate responses\n• Source Port Randomization (RFC 5452): 32-bit entropy\n• DNS-over-HTTPS/TLS: Encrypted queries\n• 0x20 Encoding: Case randomization\n• Response Rate Limiting: Slows flood attacks\n\n� HISTORICAL ATTACK (2008):\n• Resolver accepts recursive queries from attacker\n• Resolver uses UDP (connectionless - allows IP spoofing)\n• No DNSSEC validation enabled\n\n📊 RANDOMIZATION ENTROPY:\n• Transaction ID (TXID): 16 bits = 65,536 possibilities\n• Source Port: 16 bits = 65,536 possibilities (if randomized)\n• Total entropy: 32 bits = 4,294,967,296 combinations\n\n⏱️ KAMINSKY INNOVATION:\n• Old attacks: Query same domain repeatedly → cached after first response\n• Kaminsky: Query RANDOM subdomains → never cached → infinite attempts\n• Example: random1.target.com, random2.target.com, random3.target.com...\n\n🎯 ATTACK SURFACE:\n• Query format: "A random12345.target.com"\n• Resolver→Auth: UDP packet with TXID=0x1a2b, SrcPort=54321\n• Attacker can see query (packet sniffing) but NOT TXID/port (encrypted in header)',
          highlight: 'attacker',
          attack: true
        },
        { 
          step: 2, 
          title: 'Step 2: Resolver Issues Recursive Query to Authoritative Server', 
          description: 'Resolver checks cache for random12345.target.com → MISS (never queried before). Resolver generates RANDOM 16-bit Transaction ID (e.g., 0x1a2b) and random UDP source port (e.g., 54321). Sends query to authoritative nameserver for target.com. Query packet: src=8.8.8.8:54321, dst=AuthServer:53, TXID=0x1a2b.', 
          actors: ['resolver', 'auth-server'],
          hasPackets: true,
          technicalDetails: '📡 RESOLVER QUERY DETAILS:\n• Outbound packet: DNS Query for "random12345.target.com" (type A)\n• Source IP: 8.8.8.8 (resolver IP)\n• Source Port: 54321 (ephemeral, randomly chosen from 1024-65535)\n• Destination: 198.41.0.4:53 (authoritative server for target.com)\n• Transaction ID: 0x1a2b (16-bit random, chosen by resolver)\n• Flags: QR=0 (query), RD=1 (recursion desired), AA=0\n\n🔐 SECURITY PARAMETERS:\n• TXID entropy: 16 bits (weak but better than nothing)\n• Port randomization: Modern resolvers randomize (adds 16 bits entropy)\n• Total guessing difficulty: 2^32 = 4.3 billion combinations\n\n⏳ TIMING WINDOW:\n• Round-trip time (RTT) to auth server: ~50-500ms\n• Attacker has this window to send forged responses\n• First matching response (TXID + port) wins!',
          highlight: 'resolver'
        },
        { 
          step: 3, 
          title: 'Step 3: RACE CONDITION - Attacker Floods with Forged Responses', 
          description: 'Attacker FLOODS resolver with THOUSANDS of forged DNS responses (spoofed from authoritative server IP). Each forged packet guesses different TXID (0x0000, 0x0001, 0x0002...0xFFFF) and port combinations. Forged responses contain MALICIOUS records: "target.com A 6.6.6.6" + NS records pointing to attacker\'s nameserver. If ANY forged response matches TXID+port BEFORE legitimate response arrives → ACCEPTED & CACHED!', 
          actors: ['attacker', 'resolver', 'auth-server'], 
          attack: true,
          hasPackets: true,
          hasImpact: true,
          technicalDetails: '⚡ KAMINSKY FLOODING TECHNIQUE:\n• Attack rate: 1,000-10,000 forged responses per second\n• Each forged packet tries different TXID (brute-force guessing)\n• Source IP: SPOOFED to match authoritative server (198.41.0.4)\n• Destination: Resolver IP:guessed_port\n\n📦 FORGED PACKET STRUCTURE:\n• DNS Response flags: QR=1 (response), AA=1 (authoritative), RD=1\n• Answer section: "random12345.target.com A 6.6.6.6" (ignored - just to match query)\n• **CRITICAL - Additional section:**\n  → "target.com NS ns.evil.com" (authority record - THIS is the poison!)\n  → "ns.evil.com A 6.6.6.6" (glue record - attacker\'s IP)\n• TTL: 86400 seconds (24 hours - maximize persistence)\n\n🎲 PROBABILITY CALCULATION:\n• Probability per packet: 1 / 4,294,967,296 (if port randomized)\n• With 10,000 attempts: ~0.0002% chance per query\n• Kaminsky twist: Repeat with NEW random subdomain → unlimited attempts!\n• Success after ~200,000 random subdomain queries (takes minutes)\n\n🏆 WINNING CONDITION:\n• Forged response arrives BEFORE legitimate response (race!)\n• TXID matches (e.g., 0x1a2b) ✓\n• Source port matches (e.g., 54321) ✓\n• Source IP matches authoritative server ✓\n• → Resolver accepts forged response, caches poisoned data!',
          poisoned: false
        },
        { 
          step: 4, 
          title: 'Step 4: Cache Successfully Poisoned - Malicious Records Cached', 
          description: 'ONE forged response matched! Resolver accepted forged packet (TXID=0x1a2b, port=54321 matched). Resolver CACHES poisoned records for target.com: "target.com NS ns.evil.com" + "ns.evil.com A 6.6.6.6". TTL=86400s (24 hours). Legitimate response arrives 50ms later but IGNORED (duplicate). Cache now contains ATTACKER\'S nameserver for ALL target.com queries!', 
          actors: ['resolver', 'attacker'], 
          poisoned: true,
          hasPackets: true,
          hasImpact: true,
          technicalDetails: '💥 CACHE POISONING COMPLETE:\n• Poisoned cache entry:\n  → "target.com NS ns.evil.com" (TTL: 86400s)\n  → "ns.evil.com A 6.6.6.6" (TTL: 86400s)\n• Cached timestamp: 2024-11-11 14:32:17 UTC\n• Expiry: 2024-11-12 14:32:17 UTC (24 hours)\n\n🔴 ATTACK AMPLIFICATION:\n• Not just random12345.target.com poisoned\n• **ENTIRE DOMAIN target.com** poisoned via NS record!\n• Future queries for www.target.com, mail.target.com, api.target.com → ALL resolve via attacker\'s nameserver\n\n⚠️ IMPACT SCOPE:\n• All users querying THIS resolver affected\n• If resolver is ISP DNS: millions of users compromised\n• If resolver is Google 8.8.8.8: GLOBAL impact (though Google has mitigations)\n\n📊 PERSISTENCE:\n• Poisoned cache persists for 24 hours (TTL)\n• Even if attacker disconnects, attack continues\n• Resolver will RE-POISON after TTL expires if attacker maintains attack\n\n🎭 STEALTH:\n• Resolver logs show "normal" DNS response from authoritative server (spoofed IP)\n• No error messages or warnings\n• Attack completely invisible to monitoring tools (unless analyzing TXID patterns)',
          highlight: 'resolver'
        },
        { 
          step: 5, 
          title: 'Step 5: Mass Victim Impact - Users Redirected to Malicious Sites', 
          description: 'ALL users querying poisoned resolver for target.com (or subdomains) receive ATTACKER\'S IP. Example: User queries www.target.com → Resolver returns 6.6.6.6 (attacker\'s phishing server) from poisoned cache. User connects to fake website, enters credentials → STOLEN. Attack affects THOUSANDS of users for 24+ hours until cache expires. Attacker can re-poison to extend attack indefinitely.', 
          actors: ['client', 'resolver', 'victim'], 
          spread: true,
          poisoned: true,
          hasPackets: true,
          technicalDetails: '🌐 VICTIM PROPAGATION:\n• Victim #1 queries www.target.com → gets 6.6.6.6 (attacker)\n• Victim #2 queries mail.target.com → gets 6.6.6.6 (attacker)\n• Victim #3 queries api.target.com → gets 6.6.6.6 (attacker)\n• All subdomains resolve to attacker due to poisoned NS record!\n\n💀 ATTACK SCENARIOS:\n1. **Phishing:** Attacker hosts pixel-perfect copy of target.com on 6.6.6.6\n   → Users enter login credentials → credentials stolen\n   → Attacker proxies to real site → user never notices\n\n2. **Malware Distribution:** 6.6.6.6 serves malware instead of legitimate software\n   → Users download "updates" → ransomware/spyware installed\n\n3. **Man-in-the-Middle:** Attacker proxies ALL traffic through 6.6.6.6\n   → SSL/TLS certificates forged (browser warnings, but often ignored)\n   → Session cookies, API keys, payment info intercepted\n\n4. **Persistent Backdoor:** Attacker poisons NS records perpetually\n   → Even after cache expires, attacker re-poisons with new random subdomains\n   → Attack can persist for MONTHS if undetected\n\n🛡️ MITIGATIONS (Modern DNS Security):\n1. **DNSSEC:** Cryptographic signatures validate responses (attacker can\'t forge)\n   → Requires authoritative server AND resolver support\n   → Only ~30% of domains use DNSSEC (as of 2024)\n\n2. **Source Port Randomization (RFC 5452):** Use full 16-bit port space\n   → Increases entropy from 2^16 to 2^32\n   → Makes guessing 4.3 billion times harder\n\n3. **0x20 Encoding:** Randomize capitalization of domain in query\n   → "tArGeT.CoM" vs "TaRgEt.cOm" (DNS case-insensitive but preserves case)\n   → Response must match exact case → adds ~10 bits entropy\n\n4. **Response Rate Limiting (RRL):** Limit responses per IP/subnet\n   → Slows down attacker\'s flood attempts\n\n5. **DNS-over-HTTPS (DoH) / DNS-over-TLS (DoT):** Encrypted DNS\n   → Prevents packet sniffing and MITM\n   → Resolver→Auth still vulnerable unless DNSSEC used\n\n🔍 DETECTION:\n• Unusual spike in queries for random subdomains\n• Multiple DNS responses for same TXID (forged + legitimate)\n• Sudden NS record changes for popular domains\n• User reports of certificate warnings or phishing pages',
          highlight: 'victim'
        }
      ],

      
      
      'mitm': [
        { 
          step: 1, 
          title: 'Victim Connects to Rogue WiFi', 
          description: 'User connects to "Free_Airport_WiFi" - actually attacker\'s Evil Twin access point. Attacker controls entire network layer including DHCP and DNS server assignment', 
          actors: ['client', 'wifi'],
          hasPackets: false,
          technicalDetails: 'Evil Twin: Fake AP with same SSID as legitimate network. DHCP response assigns attacker\'s IP as DNS server (e.g., 192.168.1.1 = attacker). Client unknowingly trusts attacker for all DNS'
        },
        { 
          step: 2, 
          title: 'DNS Query Intercepted', 
          description: 'User types paypal.com in browser. DNS query sent to attacker\'s machine (configured as DNS server via DHCP). Query: "A" record for paypal.com', 
          actors: ['client', 'wifi', 'attacker'],
          hasPackets: true,
          technicalDetails: 'Query captured at layer 2 (Ethernet) before leaving local network. Attacker has full visibility: domain names, timing patterns, user behavior'
        },
        { 
          step: 3, 
          title: 'Attacker Decision Point', 
          description: 'Attacker analyzes domain. For high-value targets (banks, social media, email), prepares fake response. For others, may proxy to real DNS to avoid detection', 
          actors: ['attacker'], 
          attack: true, 
          highlight: 'attacker',
          hasPackets: false,
          technicalDetails: 'Selective poisoning strategy: Banks/PayPal → fake IP (phishing server). Google/CDN → real IP (to avoid suspicion). DNS-over-HTTPS requests → blocked or MITMed'
        },
        { 
          step: 4, 
          title: 'Malicious DNS Response Injected', 
          description: 'Attacker sends forged DNS response: paypal.com → 203.0.113.66 (attacker\'s phishing server). Response looks identical to legitimate DNS, includes correct Transaction ID since attacker saw query', 
          actors: ['attacker', 'client'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Forged Response Fields: Answer RR (paypal.com A 203.0.113.66), TTL: 300 (short to avoid long-term caching issues), AA bit set (authoritative answer). SSL cert issue handled via: fake cert, SSLStrip downgrade, or browser warnings ignored'
        },
        { 
          step: 5, 
          title: 'Complete Traffic Interception', 
          description: 'User connects to 203.0.113.66 thinking it\'s PayPal. Enters credentials on pixel-perfect phishing page. Attacker captures: username, password, 2FA codes, session cookies. Can also proxy to real PayPal to avoid suspicion', 
          actors: ['client', 'fake-server'], 
          poisoned: true,
          hasPackets: true,
          technicalDetails: 'Advanced attacks: SSLstrip (downgrades HTTPS to HTTP), Homograph domains (pаypal.com with Cyrillic "а"), Session hijacking. Mitigation: VPN usage, DNS-over-HTTPS (DoH), DNS-over-TLS (DoT), verify HTTPS certificates'
        }
      ],

      
      
      'amplification': [
        { 
          step: 1, 
          title: 'Reconnaissance: Finding Open Resolvers', 
          description: 'Attacker scans internet for misconfigured DNS servers accepting recursive queries from anyone (open resolvers). Finds ~1 million vulnerable servers using Shodan, Masscan, or ZMap', 
          actors: ['attacker', 'resolver'],
          hasPackets: false,
          technicalDetails: 'Open resolvers: DNS servers with recursion enabled for any IP (should be restricted to local network only). Test query: "dig @target_ip google.com". If responds → vulnerable. Common ports: 53/UDP, 53/TCP, 5353/UDP (mDNS)'
        },
        { 
          step: 2, 
          title: 'IP Spoofing: Crafting Attack Packets', 
          description: 'Attacker sends DNS queries with VICTIM\'S IP as source address (IP spoofing). Query: "ANY" record for isc.org (returns max data). Packet size: ~60 bytes. Sent to 100,000 open resolvers simultaneously', 
          actors: ['attacker', 'resolver'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Spoofed IP Packet: src=VICTIM_IP (e.g., 192.0.2.1), dst=OPEN_RESOLVER. DNS Query Type "ANY" or "TXT" for domains with large records. No TCP handshake needed (UDP allows spoofing). Botnet sends millions of queries per second'
        },
        { 
          step: 3, 
          title: 'Amplification: 100x Traffic Multiplication', 
          description: '100,000 DNS servers each respond to victim with 4KB answers. Input: 60 bytes × 100,000 = 6 MB. Output: 4,000 bytes × 100,000 = 400 MB. Amplification factor: 67x! Victim receives 400 MB for attacker\'s 6 MB effort', 
          actors: ['resolver', 'victim'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Amplification Records: ANY query response includes A, AAAA, MX, TXT, NS, SOA = 4KB+. TXT records with DKIM/SPF data can be huge. DNSSEC responses (DNSKEY, RRSIG) amplify up to 179x. Historical record: 1.35 Tbps attack on GitHub (2018)'
        },
        { 
          step: 4, 
          title: 'Network Saturation & Resource Exhaustion', 
          description: 'Victim\'s network bandwidth completely saturated. 400 Gbps+ traffic floods all links. Routers drop packets, connections timeout. Legitimate traffic cannot reach servers. Services completely offline', 
          actors: ['resolver', 'victim'], 
          attack: true, 
          highlight: 'victim',
          hasPackets: true,
          technicalDetails: 'Impact layers: Network (bandwidth exhaustion), Transport (connection table overflow), Application (CPU exhaustion processing packets). Collateral damage: ISP infrastructure congestion, neighboring services affected. Duration: hours to days if not mitigated'
        },
        { 
          step: 5, 
          title: 'Sustained DDoS: Multi-Vector Attack', 
          description: 'Attacker rotates through millions of open resolvers to evade blocking. Combines DNS amplification with NTP, SSDP, Memcached reflection. Total attack volume: 1+ Terabit/sec. Website remains offline for hours until DDoS mitigation deployed', 
          actors: ['resolver', 'victim'], 
          poisoned: true,
          hasPackets: false,
          technicalDetails: 'Mitigation: BCP38 (ISP blocks spoofed IPs), Rate limiting DNS responses, Disable recursion on public servers, Anycast distribution, DDoS scrubbing services (Cloudflare, Akamai), Response Rate Limiting (RRL). Prevention: Close open resolvers!'
        }
      ],

      
      
      'tunneling': [
        { 
          step: 1, 
          title: 'Malware Infection & Command Server Setup', 
          description: 'Victim infected with malware needing to communicate with Command & Control (C2) server. Firewall blocks direct connections but allows DNS (port 53). Attacker controls malicious DNS nameserver: ns1.evil-domain.com', 
          actors: ['attacker', 'client'],
          hasPackets: false,
          technicalDetails: 'C2 Channel Requirements: Bidirectional communication, Bypass firewalls/DPI, Low detection rate. DNS perfect because: Always allowed, Encrypted payloads look like subdomains, Decentralized (hard to block). Tools: Iodine, DNSCat2, Cobalt Strike'
        },
        { 
          step: 2, 
          title: 'Data Encoding in DNS Queries', 
          description: 'Malware encodes stolen data (passwords, credit cards, files) as Base32/Base64. Embeds in subdomain labels: 4a7b3f9e2d1c.8f6e4d2a1b9c.evil-domain.com (each label = 63 chars max). Sends as legitimate DNS "A" query', 
          actors: ['client', 'resolver'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Encoding scheme: Data → Base32 → Split into 63-char chunks → Create subdomain hierarchy. Example: "password123" → "MFRGG3DFMZTWQ3DN" → "MFRGG3DFMZTWQ3DN.evil-domain.com". Query types used: A, AAAA, TXT, NULL (NULL allows binary data)'
        },
        { 
          step: 3, 
          title: 'Firewall Bypass: DNS Always Allowed', 
          description: 'Corporate firewall allows UDP/53 (DNS) to internet. Deep Packet Inspection (DPI) sees legitimate DNS query format. Query passes through firewall, IDS, and proxy without triggering alerts. Reaches external DNS infrastructure', 
          actors: ['client', 'firewall', 'resolver'],
          hasPackets: true,
          technicalDetails: 'Evasion techniques: Slow query rate (1-5 per minute to avoid anomaly detection), Random subdomains (avoid pattern matching), Use public resolvers (Google 8.8.8.8) as relay, Polymorphic subdomain generation (different each time), Legitimate-looking domains'
        },
        { 
          step: 4, 
          title: 'Data Exfiltration to Attacker Server', 
          description: 'Public DNS resolver forwards query to evil-domain.com nameserver (attacker controls it). Attacker\'s DNS server logs query, extracts encoded data from subdomain. Decodes Base32 → recovers stolen data. Sends instructions via DNS response', 
          actors: ['attacker', 'resolver'],
          hasPackets: true,
          technicalDetails: 'Bidirectional tunnel: Exfiltration: Queries carry data OUT. Commands: TXT/A responses carry commands IN (IP = encoded command). Throughput: ~50-200 KB/day (slow but undetected). Real attacks: APT groups use for months undetected'
        },
        { 
          step: 5, 
          title: 'Command & Control Channel Established', 
          description: 'Full C2 tunnel active over DNS. Attacker sends commands (download more malware, ransomware trigger, pivot to other systems) via DNS responses. Malware receives commands, executes, exfiltrates results. All invisible to security tools', 
          actors: ['attacker'], 
          poisoned: true,
          hasPackets: false,
          technicalDetails: 'C2 commands via TXT records: "v=spf1 include:exec-payload include:ransomware-activate" (looks like SPF). Detection: Unusual query patterns, High entropy in subdomains, Excessive queries to single domain, Long subdomain lengths. Mitigation: DNS firewall, Machine learning anomaly detection, Block known tunneling tools'
        }
      ],

      
      
      'nxdomain-flood': [
        { 
          step: 1, 
          title: 'Botnet Deployment & Attack Initialization', 
          description: 'Attacker controls 500,000 IoT devices (cameras, routers) in botnet. Generates list of random, non-existent domains: 8f3k2j9d.com, x9q2m4p1.net, 7a3d8f2k.org. Prepares to send 10 million queries/second to target DNS resolver', 
          actors: ['attacker', 'botnet'],
          hasPackets: false,
          technicalDetails: 'Random Domain Generation Algorithm (DGA): Cryptographic random strings, Ensure domains don\'t exist (avoid cache hits), Rotate through TLDs (.com, .net, .org, .xyz), Each bot generates unique domains. Target: Enterprise DNS resolver or ISP recursive server'
        },
        { 
          step: 2, 
          title: 'Flood of Non-Existent Domain Queries', 
          description: 'Botnet floods target resolver: 10M queries/sec for random domains that don\'t exist. Each query: "A record for 7f4j3k8d.com". Resolver cannot serve from cache (domains never queried before). Must query authoritative servers for each', 
          actors: ['botnet', 'resolver'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Attack characteristics: 100% cache miss rate (random domains), Bypasses cache-based defenses, Forces full recursive resolution chain, Queries distributed across all TLDs (.com, .net, .org), Legitimate traffic mixed in (hard to filter completely)'
        },
        { 
          step: 3, 
          title: 'Authoritative Server Cascade Overload', 
          description: 'Resolver forwards 10M queries/sec to TLD servers (.com, .net). TLD servers respond "NXDOMAIN" (domain doesn\'t exist) but overwhelmed. Root servers, TLD servers, resolver all processing nonsense queries. Legitimate queries buried in flood', 
          actors: ['resolver', 'auth-server'], 
          attack: true,
          hasPackets: true,
          technicalDetails: 'Impact cascade: 1) Resolver: CPU maxed processing queries, memory exhausted, 2) TLD servers: Rate-limited responses, SERVFAIL errors, 3) Network: Bandwidth saturated with NXDOMAIN responses, 4) Collateral: Other domains sharing infrastructure affected'
        },
        { 
          step: 4, 
          title: 'DNS Resolver Resource Exhaustion', 
          description: 'Resolver CPU at 100% (processing millions of NXDOMAIN responses). Memory full (query queue backlog). Connection table exhausted. Legitimate DNS queries timing out or failing. Websites unreachable, email delivery failing, apps broken', 
          actors: ['resolver'], 
          highlight: 'resolver',
          hasPackets: false,
          technicalDetails: 'Resource limits hit: CPU: Query processing cycles exhausted, RAM: Query queue grows to GB, limits exceeded, Sockets: 65K connection limit reached, can\'t accept new queries, Disk I/O: Logging/caching saturates disk. Resolver becomes unresponsive'
        },
        { 
          step: 5, 
          title: 'Service Outage & Widespread Impact', 
          description: 'DNS resolution completely failed. ALL internet services broken for users behind this resolver: websites won\'t load, email fails, apps offline, VoIP calls drop. Thousands to millions of users affected. Service remains down until attack mitigated', 
          actors: ['client', 'resolver'], 
          poisoned: true,
          hasPackets: false,
          technicalDetails: 'Mitigation strategies: Response Rate Limiting (RRL) - limit NXDOMAIN responses per source, Negative caching - cache NXDOMAIN responses temporarily, Aggressive timeout - drop queries under load, ACLs - block known botnet IPs, Anycast - distribute load across servers, DNSSEC validation - adds overhead but verifies integrity. Recovery time: 30min-4hrs depending on infrastructure'
        }
      ],

      
      
      'subdomain-takeover': [
        { 
          step: 1, 
          title: 'Service Decommission & DNS Misconfiguration', 
          description: 'Company (Acme Corp) uses AWS S3 for blog: blog.acmecorp.com → CNAME → acme-blog.s3.amazonaws.com. Project ends, S3 bucket deleted, but DNS CNAME record left pointing to unclaimed S3 bucket. Classic dangling DNS scenario', 
          actors: ['company', 'dns'],
          hasPackets: false,
          technicalDetails: 'Common scenarios: Cloud services (AWS S3, Azure, Heroku, GitHub Pages), CDN endpoints (CloudFront, Fastly, Akamai), SaaS platforms (Shopify, Zendesk, HubSpot), Development/staging environments. Root cause: DNS management separate from infrastructure, no cleanup process'
        },
        { 
          step: 2, 
          title: 'Dangling DNS Record Discovery', 
          description: 'DNS still has: blog.acmecorp.com CNAME acme-blog.s3.amazonaws.com (TTL 3600). But "acme-blog" bucket deleted/unclaimed on AWS. Visiting blog.acmecorp.com shows "NoSuchBucket" error. Subdomain vulnerable to takeover!', 
          actors: ['dns', 'cloud'], 
          highlight: 'dns',
          hasPackets: false,
          technicalDetails: 'Detection: Automated scanners (SubOver, subjack, Aquatone), Bounty hunters check can-i-take-over-xyz.github.io, Error signatures: S3: "NoSuchBucket", Heroku: "No such app", GitHub: "There isn\'t a GitHub Pages site here", Azure: "404 Web Site not found"'
        },
        { 
          step: 3, 
          title: 'Attacker Reconnaissance & Validation', 
          description: 'Attacker finds blog.acmecorp.com returns S3 "NoSuchBucket". Extracts bucket name from error: "acme-blog". Checks DNS: CNAME points to acme-blog.s3.amazonaws.com. Verifies bucket unclaimed. Prepares to claim resource', 
          actors: ['attacker'],
          hasPackets: false,
          technicalDetails: 'Validation steps: 1) Confirm DNS CNAME exists, 2) Visit URL, check for takeover-signature error, 3) Extract resource name from CNAME/error, 4) Attempt to claim on cloud platform, 5) Verify no existing owner. Legal gray area: Bug bounty OK, malicious use illegal'
        },
        { 
          step: 4, 
          title: 'Resource Claim & Takeover Execution', 
          description: 'Attacker creates AWS S3 bucket with exact name "acme-blog" and configures website hosting. Uploads malicious content (phishing page mimicking Acme Corp login). Within seconds, blog.acmecorp.com now serves attacker\'s content!', 
          actors: ['attacker', 'cloud'], 
          attack: true,
          hasPackets: false,
          technicalDetails: 'Claim process: S3: Create bucket "acme-blog", enable static hosting, Heroku: "heroku create acme-blog", GitHub Pages: Create repo "acme-blog", enable Pages, Azure: Register "acme-blog.azurewebsites.net". Upload content: Phishing forms, Malware downloads, Cookie stealers, Defacement'
        },
        { 
          step: 5, 
          title: 'Malicious Subdomain Control & Exploitation', 
          description: 'Attacker fully controls legitimate subdomain. Users trust blog.acmecorp.com (legitimate domain). SSL works (Let\'s Encrypt auto-issues cert for attacker). Phishing highly effective: credentials stolen, malware distributed, company reputation destroyed. Can persist for months if undetected', 
          actors: ['dns', 'attacker'], 
          poisoned: true,
          hasPackets: false,
          technicalDetails: 'Attack scenarios: Phishing: Login pages stealing credentials, Malware: Drive-by downloads, Cookie theft: Session hijacking via XSS, SEO poisoning: Black-hat SEO on trusted domain, Subdomain enumeration: Pivot to takeover more subdomains. Mitigation: Automate DNS cleanup when services decommissioned, Monitor for takeover signatures, Use DNS CAA records, Regular subdomain audits, Wildcard DNS validation'
        }
      ]
    };
    return steps[attackId] || [];
  };

  const handleNodeClick = (nodeId, step) => {
    const packetData = getPacketData(selectedAttack, step, nodeId);
    if (packetData) {
      setSelectedNode({ nodeId, step, data: packetData });
    }
  };

  const drawAttackVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight || 800; 

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const steps = getAttackSteps(selectedAttack);
    if (steps.length === 0) return;

    const currentStep = steps[Math.min(simulationStep, steps.length - 1)];
    const attack = attacks.find(a => a.id === selectedAttack);

    
    const marginX = 100; 
    const marginY = 200; 
    const safeWidth = width - (marginX * 2);
    const safeHeight = height - (marginY * 2);
    
    
    const halfWidth = width / 2;
    const halfHeight = height / 2 + 80; 
    
    
    const actorDefinitions = {
      'client': { 
        x: marginX, 
        y: halfHeight, 
        color: '#3b82f6', 
        icon: '💻', 
        label: 'Client' 
      },
      'attacker': { 
        x: halfWidth, 
        y: marginY, 
        color: '#ef4444', 
        icon: '🦹', 
        label: 'Attacker' 
      },
      'resolver': { 
        x: halfWidth, 
        y: halfHeight, 
        color: '#8b5cf6', 
        icon: '🔄', 
        label: 'DNS Resolver' 
      },
      'victim': { 
        x: marginX, 
        y: height - marginY, 
        color: '#f59e0b', 
        icon: '😱', 
        label: 'Victim' 
      },
      'auth-server': { 
        x: width - marginX, 
        y: halfHeight, 
        color: '#10b981', 
        icon: '📋', 
        label: 'Auth Server' 
      },
      'wifi': { 
        x: halfWidth, 
        y: marginY + 60, 
        color: '#6366f1', 
        icon: '📡', 
        label: 'WiFi Hotspot' 
      },
      'fake-server': { 
        x: halfWidth, 
        y: height - marginY, 
        color: '#dc2626', 
        icon: '🎭', 
        label: 'Fake Server' 
      },
      'firewall': { 
        x: halfWidth - (safeWidth * 0.25), 
        y: halfHeight, 
        color: '#64748b', 
        icon: '🛡️', 
        label: 'Firewall' 
      },
      'cloud': { 
        x: width - marginX, 
        y: height - marginY - 30, 
        color: '#06b6d4', 
        icon: '☁️', 
        label: 'Cloud Service' 
      },
      'company': { 
        x: marginX, 
        y: marginY + 40, 
        color: '#10b981', 
        icon: '🏢', 
        label: 'Company' 
      },
      'dns': { 
        x: halfWidth, 
        y: halfHeight + 60, 
        color: '#8b5cf6', 
        icon: '🌐', 
        label: 'DNS Server' 
      },
      'botnet': { 
        x: marginX, 
        y: marginY, 
        color: '#dc2626', 
        icon: '🤖', 
        label: 'Botnet' 
      }
    };

    
    const allActorsInAttack = new Set();
    steps.forEach(step => {
      step.actors.forEach(actor => allActorsInAttack.add(actor));
    });

    
    allActorsInAttack.forEach(actorId => {
      const actor = actorDefinitions[actorId];
      if (!actor) return;

      const isActive = currentStep.actors.includes(actorId);
      const isPoisoned = currentStep.poisoned && (actorId === 'resolver' || actorId === 'client' || actorId === 'victim');
      const isHighlighted = currentStep.highlight === actorId;
      const isAttacker = actorId === 'attacker' || actorId === 'fake-server';

      
      const actorGroup = g.append('g')
        .attr('class', 'actor-group')
        .attr('opacity', isActive ? 1 : 0.3) 
        .style('cursor', isActive && currentStep.hasPackets ? 'pointer' : 'default')
        .on('click', () => {
          if (isActive && currentStep.hasPackets) {
            handleNodeClick(actorId);
          }
        });

      
      if (isActive && (isHighlighted || currentStep.attack)) {
        actorGroup.append('circle')
          .attr('cx', actor.x)
          .attr('cy', actor.y)
          .attr('r', 70)
          .attr('fill', 'none')
          .attr('stroke', attack.color)
          .attr('stroke-width', 3)
          .attr('opacity', 0)
          .transition()
          .duration(1000)
          .attr('r', 85)
          .attr('opacity', 0.3)
          .transition()
          .duration(1000)
          .attr('r', 70)
          .attr('opacity', 0)
          .on('end', function repeat() {
            d3.select(this)
              .transition()
              .duration(1000)
              .attr('r', 85)
              .attr('opacity', 0.3)
              .transition()
              .duration(1000)
              .attr('r', 70)
              .attr('opacity', 0)
              .on('end', repeat);
          });
      }

      
      actorGroup.append('circle')
        .attr('cx', actor.x)
        .attr('cy', actor.y)
        .attr('r', 60)
        .attr('fill', isPoisoned ? '#dc2626' : isAttacker ? attack.color : actor.color)
        .attr('stroke', isPoisoned ? '#7f1d1d' : isActive ? '#fff' : '#555')
        .attr('stroke-width', isActive ? 4 : 2)
        .style('filter', isActive ? `drop-shadow(0 4px 12px ${isPoisoned ? '#dc262680' : actor.color + '80'})` : 'none')
        .style('cursor', 'pointer')
        .on('click', () => handleNodeClick(actorId, currentStep.step));

      
      actorGroup.append('text')
        .attr('x', actor.x)
        .attr('y', actor.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '2rem')
        .text(actor.icon)
        .style('pointer-events', 'none');

      
      const labelWidth = 120;
      const labelHeight = 28;
      const labelY = Math.min(actor.y + 70, height - 40); 
      const labelX = Math.max(labelWidth/2, Math.min(actor.x, width - labelWidth/2)); 

      
      const labelBg = actorGroup.append('rect')
        .attr('x', labelX - labelWidth/2)
        .attr('y', labelY)
        .attr('width', labelWidth)
        .attr('height', labelHeight)
        .attr('rx', 6)
        .attr('fill', isPoisoned ? 'rgba(220, 38, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        .attr('stroke', isPoisoned ? '#991b1b' : actor.color)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');

      actorGroup.append('text')
        .attr('x', labelX)
        .attr('y', labelY + labelHeight/2 + 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.85rem')
        .attr('font-weight', '700')
        .attr('fill', isPoisoned ? '#ffffff' : '#1f2937')
        .text(actor.label)
        .style('pointer-events', 'none');

      
      if (!isActive) {
        const statusY = Math.min(labelY + labelHeight + 15, height - 20);
        actorGroup.append('text')
          .attr('x', labelX)
          .attr('y', statusY)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.75rem')
          .attr('font-style', 'italic')
          .attr('fill', '#6b7280')
          .text('(Inactive)');
      }
      
      if (isPoisoned) {
        const statusY = Math.min(labelY + labelHeight + 12, height - 20);
        actorGroup.append('text')
          .attr('x', labelX)
          .attr('y', statusY)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.75rem')
          .attr('font-weight', '700')
          .attr('fill', '#dc2626')
          .text('⚠️ COMPROMISED');
      }
    });

    
    if (currentStep.hasPackets || currentStep.attack || currentStep.actors.length > 1) {
      drawPackets(g, currentStep, actorDefinitions, attack.color, selectedAttack, width);
    }

    
    const isInterceptionActive = selectedAttack === 'cache-poisoning' && simulationStep === 0 && interceptionPhase > 0;
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '1.2rem')
      .attr('font-weight', '700')
      .attr('fill', attack.color)
      .text(isInterceptionActive 
        ? `Step ${currentStep.step}: Packet Interception (Phase ${interceptionPhase}/5)`
        : `Step ${currentStep.step}/${steps.length}: ${currentStep.title}`);
  };

  
  const createPacketNode = (g, position, flow, isMalicious, id) => {
    const packetGroup = g.append('g')
      .attr('class', `packet-node packet-${id}`)
      .attr('transform', `translate(${position.x}, ${position.y})`)
      .style('cursor', 'pointer')
      .on('click', () => handlePacketClick(flow.packetData, flow));

    
    packetGroup.append('rect')
      .attr('x', -20)
      .attr('y', -20)
      .attr('width', 40)
      .attr('height', 40)
      .attr('rx', 6)
      .attr('fill', isMalicious ? '#ef4444' : '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))');

    
    packetGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '1.2rem')
      .attr('fill', '#fff')
      .text('📦');

    
    if (isMalicious || flow.malicious) {
      packetGroup.append('circle')
        .attr('cx', 15)
        .attr('cy', -15)
        .attr('r', 12)
        .attr('fill', '#dc2626')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      packetGroup.append('text')
        .attr('x', 15)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '0.8rem')
        .text('⚠️');
    }

    return packetGroup;
  };

  const drawPackets = (g, step, actors, color, attackId, svgWidth) => {
    const packetFlows = getPacketFlows(attackId, step.step);
    
    if (!packetFlows || packetFlows.length === 0) return;

    packetFlows.forEach((flow, flowIndex) => {
      const fromActor = actors[flow.from];
      const toActor = actors[flow.to];
      
      if (!fromActor || !toActor) return;

      
      const isKaminskyFlood = attackId === 'cache-poisoning' && step.step === 3;

      if (isKaminskyFlood) {
        
        const isWinningPacket = flow.label && flow.label.includes('MATCH!');
        const isLegitimate = flow.from === 'auth-server';
        const isFailed = flow.label && (flow.label.includes('#1') || flow.label.includes('#2') || flow.label.includes('#27'));
        
        if (isFailed) {
          
          const line = g.append('line')
            .attr('x1', fromActor.x)
            .attr('y1', fromActor.y)
            .attr('x2', fromActor.x)
            .attr('y2', fromActor.y)
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0);

          line.transition()
            .delay(flowIndex * 150)
            .duration(300)
            .attr('opacity', 0.4)
            .attr('x2', toActor.x)
            .attr('y2', toActor.y)
            .transition()
            .duration(200)
            .attr('opacity', 0);

          const packet = createPacketNode(g, fromActor, flow, true, `failed-${flowIndex}`);
          packet.attr('opacity', 0.6);
          
          
          packet.append('text')
            .attr('x', 0)
            .attr('y', -22)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.65rem')
            .attr('font-weight', '700')
            .attr('fill', '#ef4444')
            .text('❌');

          packet.transition()
            .delay(flowIndex * 150)
            .duration(500)
            .attr('transform', `translate(${toActor.x}, ${toActor.y})`)
            .attr('opacity', 0);

        } else if (isWinningPacket) {
          
          const line = g.append('line')
            .attr('x1', fromActor.x)
            .attr('y1', fromActor.y)
            .attr('x2', fromActor.x)
            .attr('y2', fromActor.y)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 5)
            .attr('stroke-dasharray', '10,5')
            .attr('opacity', 0)
            .style('filter', 'drop-shadow(0 0 8px #f59e0b)');

          line.transition()
            .delay(flowIndex * 150 + 100)
            .duration(600)
            .attr('opacity', 1)
            .attr('x2', toActor.x)
            .attr('y2', toActor.y);

          const packet = createPacketNode(g, fromActor, flow, true, 'winning-packet');
          
          
          packet.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 25)
            .attr('fill', 'none')
            .attr('stroke', '#10b981')
            .attr('stroke-width', 3)
            .attr('opacity', 0)
            .transition()
            .delay(flowIndex * 150 + 700)
            .duration(400)
            .attr('opacity', 1)
            .attr('r', 35)
            .transition()
            .duration(300)
            .attr('opacity', 0)
            .attr('r', 45);

          packet.append('text')
            .attr('x', 0)
            .attr('y', -28)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.9rem')
            .attr('font-weight', '700')
            .attr('fill', '#10b981')
            .attr('opacity', 0)
            .text('✅ MATCH!')
            .transition()
            .delay(flowIndex * 150 + 600)
            .duration(400)
            .attr('opacity', 1);

          packet.transition()
            .delay(flowIndex * 150 + 100)
            .duration(800)
            .attr('transform', `translate(${toActor.x}, ${toActor.y})`);

          
          const successBox = g.append('rect')
            .attr('x', toActor.x - 130)
            .attr('y', toActor.y + 50)
            .attr('width', 260)
            .attr('height', 65)
            .attr('rx', 8)
            .attr('fill', '#fef3c7')
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 3)
            .attr('opacity', 0);

          successBox.transition()
            .delay(flowIndex * 150 + 1000)
            .duration(500)
            .attr('opacity', 1);

          const successText = g.append('text')
            .attr('x', toActor.x)
            .attr('y', toActor.y + 75)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.9rem')
            .attr('font-weight', '700')
            .attr('fill', '#d97706')
            .attr('opacity', 0)
            .text('💀 RACE WON!');

          successText.transition()
            .delay(flowIndex * 150 + 1200)
            .duration(400)
            .attr('opacity', 1);

          const successDetail = g.append('text')
            .attr('x', toActor.x)
            .attr('y', toActor.y + 95)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.75rem')
            .attr('fill', '#92400e')
            .attr('opacity', 0)
            .text('TXID=0x1a2b + Port=54321');

          successDetail.transition()
            .delay(flowIndex * 150 + 1400)
            .duration(400)
            .attr('opacity', 1);

        } else if (isLegitimate) {
          
          const line = g.append('line')
            .attr('x1', fromActor.x)
            .attr('y1', fromActor.y)
            .attr('x2', fromActor.x)
            .attr('y2', fromActor.y)
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0);

          line.transition()
            .delay(flowIndex * 150 + 200)
            .duration(800)
            .attr('opacity', 0.6)
            .attr('x2', toActor.x)
            .attr('y2', toActor.y);

          const packet = createPacketNode(g, fromActor, flow, false, 'legitimate-late');
          
          packet.append('text')
            .attr('x', 0)
            .attr('y', -28)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.75rem')
            .attr('font-weight', '700')
            .attr('fill', '#3b82f6')
            .text('⏱️ TOO LATE');

          packet.transition()
            .delay(flowIndex * 150 + 200)
            .duration(1000)
            .attr('transform', `translate(${toActor.x}, ${toActor.y})`);

          
          const discardedLabel = g.append('text')
            .attr('x', toActor.x)
            .attr('y', toActor.y + 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.85rem')
            .attr('font-weight', '700')
            .attr('fill', '#dc2626')
            .attr('opacity', 0)
            .text('❌ DISCARDED');

          discardedLabel.transition()
            .delay(flowIndex * 150 + 1200)
            .duration(400)
            .attr('opacity', 1);
        } else {
          
          drawNormalPacket(g, fromActor, toActor, flow, flowIndex);
        }

        
        if (flowIndex === 0) {
          const floodIndicator = g.append('text')
            .attr('x', fromActor.x + 60)
            .attr('y', fromActor.y - 40)
            .attr('text-anchor', 'start')
            .attr('font-size', '0.85rem')
            .attr('font-weight', '700')
            .attr('fill', '#ef4444')
            .attr('opacity', 0)
            .text('⚡ FLOODING: 10,000 packets/sec');

          floodIndicator.transition()
            .duration(500)
            .attr('opacity', 1);

          
          for (let i = 0; i < 20; i++) {
            const wavePacket = g.append('circle')
              .attr('cx', fromActor.x)
              .attr('cy', fromActor.y)
              .attr('r', 3)
              .attr('fill', '#ef4444')
              .attr('opacity', 0.4);

            wavePacket.transition()
              .delay(i * 50)
              .duration(800)
              .attr('cx', toActor.x)
              .attr('cy', toActor.y)
              .attr('opacity', 0);
          }
        }

      } else {
        
        drawNormalPacket(g, fromActor, toActor, flow, flowIndex);
      }
    });
  };

  
  const drawNormalPacket = (g, fromActor, toActor, flow, flowIndex) => {
    
    if (fromActor === toActor) {
      
      const centerX = fromActor.x;
      const centerY = fromActor.y;
      const loopRadius = 50;

      
      const loopPath = g.append('path')
        .attr('d', `M ${centerX} ${centerY - 20} 
                    A ${loopRadius} ${loopRadius} 0 1 1 ${centerX + 1} ${centerY - 20}`)
        .attr('fill', 'none')
        .attr('stroke', flow.malicious ? '#ef4444' : '#f59e0b')
        .attr('stroke-width', flow.malicious ? 4 : 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0);

      loopPath.transition()
        .delay(flowIndex * 600)
        .duration(400)
        .attr('opacity', 0.6);

      
      const processingIcon = g.append('text')
        .attr('x', centerX)
        .attr('y', centerY - 70)
        .attr('text-anchor', 'middle')
        .attr('font-size', '1.5rem')
        .attr('opacity', 0)
        .text(flow.malicious ? '⚙️' : '🔄');

      processingIcon.transition()
        .delay(flowIndex * 600 + 400)
        .duration(300)
        .attr('opacity', 1);

      
      const label = g.append('text')
        .attr('x', centerX)
        .attr('y', centerY - 90)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.75rem')
        .attr('font-weight', '600')
        .attr('fill', flow.malicious ? '#fca5a5' : '#fbbf24')
        .attr('opacity', 0)
        .text(flow.label || 'Processing...');

      label.transition()
        .delay(flowIndex * 600 + 400)
        .duration(300)
        .attr('opacity', 1);

      
      if (flow.malicious) {
        const warningBox = g.append('rect')
          .attr('x', centerX - 80)
          .attr('y', centerY + 30)
          .attr('width', 200)
          .attr('height', 30)
          .attr('rx', 4)
          .attr('fill', 'rgba(239, 68, 68, 0.1)')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 2)
          .attr('opacity', 0);

        const warningText = g.append('text')
          .attr('x', centerX)
          .attr('y', centerY + 50)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.7rem')
          .attr('font-weight', '600')
          .attr('fill', '#dc2626')
          .attr('opacity', 0)
          .text('⚠️ Attack Preparation');

        warningBox.transition()
          .delay(flowIndex * 600 + 700)
          .duration(300)
          .attr('opacity', 1);

        warningText.transition()
          .delay(flowIndex * 600 + 700)
          .duration(300)
          .attr('opacity', 1);
      }

      return; 
    }

    
    const offsetY = flowIndex * 15 - 15; 
    const midX = (fromActor.x + toActor.x) / 2;
    const midY = (fromActor.y + toActor.y) / 2 + offsetY;

    
    const line = g.append('line')
      .attr('x1', fromActor.x)
      .attr('y1', fromActor.y)
      .attr('x2', fromActor.x)
      .attr('y2', fromActor.y)
      .attr('stroke', flow.malicious ? '#ef4444' : '#3b82f6')
      .attr('stroke-width', flow.malicious ? 4 : 3)
      .attr('stroke-dasharray', flow.malicious ? '10,5' : '5,5')
      .attr('opacity', 0);

    line.transition()
      .delay(flowIndex * 600)
      .duration(400)
      .attr('opacity', 0.6)
      .transition()
      .duration(1200)
      .attr('x2', toActor.x)
      .attr('y2', toActor.y);

    
    const packetGroup = createPacketNode(g, fromActor, flow, flow.malicious, `packet-${flowIndex}`);

    if (flow.malicious) {
      
      const dangerGlow = packetGroup.append('circle')
        .attr('r', 25)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('opacity', 0);

      dangerGlow.transition()
        .delay(flowIndex * 600)
        .duration(1000)
        .attr('r', 35)
        .attr('opacity', 0.5)
        .transition()
        .duration(1000)
        .attr('r', 25)
        .attr('opacity', 0)
        .on('end', function repeat() {
          d3.select(this).transition()
            .duration(1000)
            .attr('r', 35)
            .attr('opacity', 0.5)
            .transition()
            .duration(1000)
            .attr('r', 25)
            .attr('opacity', 0)
            .on('end', repeat);
        });
    }

    
    const labelText = flow.label || 'DNS Packet';
    const labelWidth = Math.max(120, labelText.length * 7); 
    
    const labelBg = g.append('rect')
      .attr('x', fromActor.x - labelWidth/2)
      .attr('y', fromActor.y - 50)
      .attr('width', labelWidth)
      .attr('height', 20)
      .attr('rx', 4)
      .attr('fill', flow.malicious ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)')
      .attr('stroke', flow.malicious ? '#ef4444' : '#3b82f6')
      .attr('stroke-width', 1)
      .attr('opacity', 1); 

    const label = g.append('text')
      .attr('x', fromActor.x)
      .attr('y', fromActor.y - 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.75rem')
      .attr('font-weight', '600')
      .attr('fill', flow.malicious ? '#fca5a5' : '#93c5fd')
      .attr('opacity', 1) 
      .text(labelText);

    
    packetGroup.transition()
      .delay(flowIndex * 600 + 400)
      .duration(1500)
      .attr('transform', `translate(${toActor.x}, ${toActor.y})`)
      .on('end', function() {
        
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .attr('width', 50)
          .attr('height', 50)
          .attr('x', -25)
          .attr('y', -25)
          .transition()
          .duration(200)
          .attr('width', 40)
          .attr('height', 40)
          .attr('x', -20)
          .attr('y', -20);
      });

    
    labelBg.transition()
      .delay(flowIndex * 600 + 400)
      .duration(1500)
      .attr('x', toActor.x - labelWidth/2)
      .attr('y', toActor.y - 50);

    label.transition()
      .delay(flowIndex * 600 + 400)
      .duration(1500)
      .attr('x', toActor.x)
      .attr('y', toActor.y - 35);

    
    if (flow.malicious) {
      const warningIcon = g.append('text')
        .attr('x', fromActor.x + 25)
        .attr('y', fromActor.y - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '1.2rem')
        .attr('opacity', 1) 
        .text('⚠️');

      
      warningIcon.transition()
        .delay(flowIndex * 600 + 400)
        .duration(1500)
        .attr('x', toActor.x + 25)
        .attr('y', toActor.y - 10);
    }
  };

  const getPacketFlows = (attackId, step) => {
    const flows = {
      
      'cache-poisoning': {
        1: [
          
          { from: 'attacker', to: 'resolver', label: '🎯 Kaminsky Query: random12345.target.com', malicious: true,
            packetData: { 
              type: 'DNS Query (Kaminsky Trigger)', 
              transactionID: 'Unknown to attacker', 
              flags: { QR: 0, AA: 0, RD: 1 }, 
              question: { name: 'random12345.target.com', type: 'A', class: 'IN' }, 
              sourceIP: '203.0.113.25 (Attacker or spoofed client)', 
              destinationIP: '8.8.8.8 (Target resolver)',
              kaminskySrategy: 'Random subdomain prevents cache hit',
              purpose: 'Force resolver to query authoritative server',
              entropy: 'Resolver will generate random TXID + source port',
              attackWindow: 'RTT to auth server (~50-500ms)'
            }
          }
        ],
        2: [
          
          { from: 'resolver', to: 'auth-server', label: '📡 Recursive Query to Auth Server', malicious: false,
            packetData: { 
              type: 'Recursive DNS Query', 
              transactionID: '0x1a2b (Random 16-bit)', 
              question: { name: 'random12345.target.com', type: 'A' }, 
              sourceIP: '8.8.8.8 (Resolver)',
              sourcePort: '54321 (Random ephemeral port)',
              destinationIP: '198.41.0.4 (Auth server for target.com)',
              destinationPort: '53',
              protocol: 'UDP',
              entropy: {
                txidBits: 16,
                portBits: 16,
                totalCombinations: '4,294,967,296 (2^32)'
              },
              timing: 'Resolver waiting for response...',
              vulnerability: 'First matching response (TXID + port) wins!',
              status: 'VULNERABLE - Race condition window open'
            }
          }
        ],
        3: [
          
          { from: 'attacker', to: 'resolver', label: '⚡ Forged Response #1 (TXID=0x0000)', malicious: true,
            packetData: { 
              type: 'Forged DNS Response (Attempt #1)', 
              transactionID: '0x0000 (Guess)', 
              sourceIP: '198.41.0.4 (SPOOFED - Auth server)', 
              sourcePort: '53',
              destinationIP: '8.8.8.8 (Resolver)',
              destinationPort: '54321 (Guessed)',
              flags: { QR: 1, AA: 1, RD: 1, RA: 1 },
              answer: { 
                name: 'random12345.target.com', 
                type: 'A', 
                ttl: 300, 
                data: '6.6.6.6 (Decoy - ignored)' 
              },
              additionalRecords: [
                { name: 'target.com', type: 'NS', ttl: 86400, data: 'ns.evil.com (POISON!)' },
                { name: 'ns.evil.com', type: 'A', ttl: 86400, data: '6.6.6.6 (Attacker glue)' }
              ],
              result: '❌ DROPPED - TXID mismatch (0x0000 ≠ 0x1a2b)',
              attackPhase: 'Brute-force guessing in progress...'
            }
          },
          { from: 'attacker', to: 'resolver', label: '⚡ Forged Response #2 (TXID=0x0001)', malicious: true,
            packetData: { 
              type: 'Forged DNS Response (Attempt #2)', 
              transactionID: '0x0001 (Guess)', 
              sourceIP: '198.41.0.4 (SPOOFED)', 
              result: '❌ DROPPED - TXID mismatch',
              floodRate: '10,000 packets/second',
              progress: 'Trying all 65,536 TXID values...'
            }
          },
          { from: 'attacker', to: 'resolver', label: '⚡ Forged Response #27 (TXID=0x001a)', malicious: true,
            packetData: { 
              type: 'Forged DNS Response (Attempt #27)', 
              transactionID: '0x001a (Guess)', 
              result: '❌ DROPPED - TXID mismatch',
              strategy: 'Racing against legitimate response...'
            }
          },
          { from: 'attacker', to: 'resolver', label: '💥 Forged Response #6827 (MATCH!)', malicious: true,
            packetData: { 
              type: 'Forged DNS Response (SUCCESSFUL!)', 
              transactionID: '0x1a2b (✓ MATCH!)', 
              sourceIP: '198.41.0.4 (SPOOFED - Auth server)', 
              sourcePort: '53',
              destinationIP: '8.8.8.8 (Resolver)',
              destinationPort: '54321 (✓ MATCH!)',
              flags: { QR: 1, AA: 1, RD: 1, RA: 1 },
              answer: { 
                name: 'random12345.target.com', 
                type: 'A', 
                ttl: 300, 
                data: '6.6.6.6 (Ignored by user, just matches query)' 
              },
              additionalRecords: [
                { 
                  name: 'target.com', 
                  type: 'NS', 
                  ttl: 86400, 
                  data: 'ns.evil.com',
                  impact: '🔴 THIS IS THE POISON - Entire domain hijacked!'
                },
                { 
                  name: 'ns.evil.com', 
                  type: 'A', 
                  ttl: 86400, 
                  data: '6.6.6.6',
                  impact: 'Glue record - Attacker nameserver IP'
                }
              ],
              validation: {
                txidMatch: '✓ CORRECT (0x1a2b)',
                portMatch: '✓ CORRECT (54321)',
                ipMatch: '✓ CORRECT (198.41.0.4 spoofed)',
                timing: '✓ ARRIVED FIRST (before legitimate response)'
              },
              result: '✅ ACCEPTED & CACHED!',
              cacheDuration: '86400 seconds (24 hours)',
              warning: '💀 CACHE POISONING SUCCESSFUL!',
              impact: 'ALL future queries for target.com affected'
            }
          },
          
          { from: 'auth-server', to: 'resolver', label: '📧 Legitimate Response (Too Late)', malicious: false,
            packetData: { 
              type: 'Legitimate DNS Response', 
              transactionID: '0x1a2b (Correct)', 
              sourceIP: '198.41.0.4 (Real auth server)',
              sourcePort: '53',
              answer: { 
                name: 'random12345.target.com', 
                type: 'A', 
                ttl: 3600, 
                data: 'NXDOMAIN (Domain doesn\'t exist)' 
              },
              timing: 'Arrived 50ms AFTER forged response',
              status: 'IGNORED - Duplicate response (already answered)',
              result: '❌ DISCARDED',
              explanation: 'Resolver already received answer from "authoritative" source',
              attackSuccess: true,
              warning: '⚠️ Attacker won the race condition!'
            }
          }
        ],
        4: [
          
          { from: 'resolver', to: 'client', label: '☠️ Poisoned Response (from Cache)', malicious: true,
            packetData: { 
              type: 'DNS Response (Poisoned Cache)', 
              transactionID: '0x5678 (New query from client)', 
              flags: { QR: 1, AA: 0, RD: 1, RA: 1 },
              question: { name: 'www.target.com', type: 'A' },
              answer: { 
                name: 'www.target.com', 
                type: 'A', 
                ttl: 86395, 
                data: '6.6.6.6 (MALICIOUS - via poisoned NS record)' 
              },
              cacheStatus: 'Served from POISONED cache',
              poisonedRecords: [
                'target.com NS ns.evil.com (TTL: 86395s remaining)',
                'ns.evil.com A 6.6.6.6 (TTL: 86395s remaining)'
              ],
              resolutionPath: [
                '1. Client queries: www.target.com',
                '2. Resolver checks cache: target.com NS → ns.evil.com (POISONED)',
                '3. Resolver queries ns.evil.com (6.6.6.6) for www.target.com',
                '4. Attacker\'s nameserver returns: 6.6.6.6',
                '5. Resolver caches and returns: 6.6.6.6 to client'
              ],
              cached: true, 
              poisoned: true, 
              cacheExpiry: '86395 seconds (23h 59m 55s)', 
              affectedDomains: 'ALL subdomains of target.com',
              warning: '⚠️ POISONED CACHE - All clients affected!',
              impact: 'Every query for target.com/* redirected to attacker for 24 hours'
            }
          }
        ],
        5: [
          
          { from: 'victim', to: 'resolver', label: '👤 Victim #1 Query: www.target.com', malicious: false,
            packetData: { 
              type: 'DNS Query', 
              transactionID: '0xabcd', 
              question: { name: 'www.target.com', type: 'A' },
              sourceIP: '192.168.1.200 (Different user)',
              victimType: 'Regular user (not related to attacker)',
              unaware: true
            }
          },
          { from: 'resolver', to: 'victim', label: '☠️ Poisoned Answer (from Cache)', malicious: true,
            packetData: { 
              type: 'DNS Response (From Poisoned Cache)', 
              transactionID: '0xabcd', 
              answer: { 
                name: 'www.target.com', 
                type: 'A',
                data: '6.6.6.6 (ATTACKER IP)' 
              },
              cached: true, 
              poisoned: true,
              cacheRemaining: '86350s (23h 59m 10s)',
              warning: '⚠️ Victim will connect to ATTACKER\'S server!',
              userImpact: [
                '1. User types www.target.com in browser',
                '2. Browser connects to 6.6.6.6 (attacker phishing server)',
                '3. User sees pixel-perfect fake website',
                '4. User enters login credentials → STOLEN',
                '5. Attacker logs credentials, redirects to real site',
                '6. User never suspects compromise'
              ]
            }
          },
          { from: 'victim', to: 'resolver', label: '👤 Victim #2 Query: mail.target.com', malicious: false,
            packetData: { 
              type: 'DNS Query',
              question: { name: 'mail.target.com', type: 'A' },
              victimType: 'Another user querying different subdomain'
            }
          },
          { from: 'resolver', to: 'victim', label: '☠️ Poisoned Answer (Still Cached)', malicious: true,
            packetData: { 
              type: 'DNS Response (Poisoned)', 
              answer: { name: 'mail.target.com', data: '6.6.6.6 (EVIL)' },
              explanation: 'Poisoned NS record affects ALL subdomains',
              scalePropagation: 'Thousands of users affected per hour',
              cacheRemaining: '86340s',
              warning: '💀 Attack spreading to more victims...'
            }
          },
          { from: 'victim', to: 'resolver', label: '👥 Victims #3-1000: Various Queries', malicious: false,
            packetData: {
              type: 'Mass Queries',
              queries: ['api.target.com', 'cdn.target.com', 'shop.target.com', 'blog.target.com'],
              totalVictims: '1,000+ users',
              timeframe: 'Over 24 hours',
              allRedirected: true
            }
          },
          { from: 'resolver', to: 'victim', label: '💀 Mass Poisoned Responses', malicious: true,
            packetData: {
              type: 'Widespread Cache Poisoning',
              affectedUsers: '1,000-10,000+ users',
              stolenCredentials: 'Hundreds of username/password pairs',
              duration: '24 hours (until cache expires)',
              persistence: 'Attacker can re-poison after expiry',
              totalImpact: 'CRITICAL - Mass phishing attack',
              realWorldAnalog: 'CVE-2008-1447: Affected millions globally',
              mitigationRequired: [
                '1. Flush DNS cache immediately',
                '2. Enable DNSSEC validation',
                '3. Implement source port randomization (RFC 5452)',
                '4. Use 0x20 encoding',
                '5. Monitor for unusual NS record changes',
                '6. Migrate to DNS-over-HTTPS (DoH)'
              ]
            }
          }
        ]
      },

      
      'mitm': {
        1: [
          
          { from: 'client', to: 'wifi', label: 'Connect to "Starbucks WiFi"', malicious: false,
            packetData: { type: 'WiFi Association', ssid: 'Starbucks WiFi', 
              actualSSID: 'Evil Twin (Attacker)', security: 'Open (No password)', 
              dhcpDNS: '192.168.1.1 (Attacker\'s DNS server)', 
              warning: 'Connected to fake network!' }
          }
        ],
        2: [
          
          { from: 'client', to: 'wifi', label: 'DNS Query via WiFi', malicious: false,
            packetData: { type: 'DNS Query', transactionID: '0xabcd', flags: { QR: 0, RD: 1 }, 
              question: { name: 'paypal.com', type: 'A' }, sourceIP: '192.168.1.105', 
              destinationIP: '192.168.1.1 (Attacker\'s DNS)', via: 'Evil Twin WiFi', modifiable: ['question.name'] }
          },
          
          { from: 'wifi', to: 'attacker', label: 'Forwarded to Attacker', malicious: true,
            packetData: { type: 'Intercepted DNS Query', query: 'paypal.com', 
              interceptedAt: 'Rogue WiFi router', attacker: 'Controls DNS server',
              warning: 'Attacker sees all DNS queries!' }
          }
        ],
        3: [
          
          { from: 'attacker', to: 'attacker', label: 'Prepare Fake Response', malicious: true,
            packetData: { type: 'Attack Preparation', 
              analysis: 'Query for paypal.com detected', 
              action: 'Prepare phishing server response',
              phishingServer: '203.0.113.66',
              realPayPalIP: '64.4.250.36',
              warning: 'Setting up phishing redirect...' }
          }
        ],
        4: [
          
          { from: 'attacker', to: 'client', label: 'Fake DNS Response', malicious: true,
            packetData: { type: 'Fake DNS Response', transactionID: '0xabcd', flags: { QR: 1, AA: 1 }, 
              answer: { name: 'paypal.com', type: 'A', data: '203.0.113.66 (Phishing Server)' }, 
              realIP: '64.4.250.36 (Real PayPal)', fakeIP: '203.0.113.66 (Attacker)', 
              sourceIP: '192.168.1.1 (Rogue DNS)',
              warning: 'FAKE RESPONSE - Not from real DNS!', modifiable: ['answer.data'] }
          }
        ],
        5: [
          
          { from: 'client', to: 'fake-server', label: 'HTTPS to "PayPal"', malicious: true,
            packetData: { type: 'HTTP Request', method: 'POST', 
              url: 'https://paypal.com/login', 
              actualDestination: '203.0.113.66 (Phishing server)',
              headers: { Host: 'paypal.com', 'User-Agent': 'Mozilla/5.0' }, 
              body: 'username=victim@email.com&password=stolen123', 
              sslCertificate: 'Self-signed (Browser warning ignored)',
              warning: 'CREDENTIALS STOLEN BY ATTACKER!' }
          }
        ]
      },

      
      'amplification': {
        1: [
          
          { from: 'attacker', to: 'resolver', label: 'Scan for Open Resolver', malicious: true,
            packetData: { type: 'DNS Query (Test)', 
              question: { name: 'version.bind', type: 'TXT', class: 'CHAOS' },
              purpose: 'Identify open resolver & version',
              sourceIP: '198.51.100.25 (Attacker - real IP)',
              test: 'Will this resolver answer ANY query?',
              warning: 'Scanning for amplification targets...' }
          },
          
          { from: 'resolver', to: 'attacker', label: 'Open Resolver Found!', malicious: false,
            packetData: { type: 'DNS Response', 
              answer: { type: 'TXT', data: 'BIND 9.11.4-P2' },
              status: 'OPEN RESOLVER - Answers queries from anyone!',
              vulnerability: 'CVE-2013-5211: DNS Amplification',
              amplificationPotential: 'Up to 179x amplification',
              warning: 'Resolver can be weaponized for DDoS!' }
          }
        ],
        2: [
          
          { from: 'attacker', to: 'resolver', label: 'Spoofed Query (60 bytes)', malicious: true,
            packetData: { type: 'Spoofed DNS Query', transactionID: '0x9999', 
              sourceIP: '203.0.113.50 (VICTIM - SPOOFED!)', 
              realSourceIP: '198.51.100.25 (Attacker - hidden)', 
              destinationIP: '8.8.8.8 (Open resolver)',
              question: { name: 'isc.org', type: 'ANY', class: 'IN' }, 
              querySize: '60 bytes',
              ipSpoofing: 'Attacker forged source IP in packet header',
              warning: 'IP SPOOFING - Victim will receive response!', modifiable: ['sourceIP', 'question.type'] }
          }
        ],
        3: [
          
          { from: 'resolver', to: 'victim', label: 'Large Response (4KB)', malicious: true,
            packetData: { type: 'DNS Response (Amplified)', transactionID: '0x9999',
              sourceIP: '8.8.8.8 (Resolver)',
              destinationIP: '203.0.113.50 (Victim - spoofed target)', 
              responseSize: '4000 bytes',
              querySize: '60 bytes',
              amplificationFactor: '67x (4000÷60)', 
              records: ['A', 'AAAA', 'MX (10 records)', 'TXT (SPF, DKIM)', 'NS (6 nameservers)', 'SOA', 'DNSKEY (DNSSEC)'], 
              explanation: 'Resolver thinks victim asked for this',
              warning: 'AMPLIFIED 67x - Victim gets unwanted traffic!', modifiable: ['responseSize'] }
          }
        ],
        4: [
          
          { from: 'resolver', to: 'victim', label: 'Resolver #1 → Victim', malicious: true,
            packetData: { type: 'Amplified Response', size: '4KB', amplification: '67x' }
          },
          { from: 'resolver', to: 'victim', label: 'Resolver #2 → Victim', malicious: true,
            packetData: { type: 'Amplified Response', size: '4KB', amplification: '67x' }
          },
          { from: 'resolver', to: 'victim', label: '...100,000 more resolvers', malicious: true,
            packetData: { type: 'Amplified Response', totalTraffic: '400 GB', warning: 'NETWORK SATURATED!' }
          }
        ],
        5: [
          { from: 'resolver', to: 'victim', label: 'Sustained Flood', malicious: true,
            packetData: { type: 'DDoS Traffic', bandwidth: '1.35 Tbps', duration: 'Ongoing', 
              impact: 'All services offline', warning: 'VICTIM UNREACHABLE!' }
          }
        ]
      },

      
      'tunneling': {
        1: [
          
          { from: 'attacker', to: 'client', label: 'Malware Installation', malicious: true,
            packetData: { type: 'Malware Payload', 
              vector: 'Phishing email attachment', 
              malware: 'DNSCat2 tunneling tool',
              c2Domain: 'evil-domain.com',
              nsRecords: 'ns1.evil-domain.com → Attacker\'s server',
              stealth: 'Uses DNS (port 53) - always allowed',
              warning: 'Malware installed - C2 channel ready!' }
          }
        ],
        2: [
          
          { from: 'client', to: 'firewall', label: 'Encoded Data Query', malicious: true,
            packetData: { type: 'DNS Query (Data Exfiltration)', transactionID: '0x7777', 
              question: { name: '4a7b3f9e2d1c.8f6e4d2a1b9c.evil-domain.com', type: 'A' }, 
              rawData: 'username:admin,password:secret123',
              encoding: 'Base32',
              encodedData: '4a7b3f9e2d1c.8f6e4d2a1b9c (first 24 chars)',
              maxSubdomainLength: '63 chars per label',
              port: 53,
              protocol: 'UDP',
              destination: 'External DNS (via firewall)',
              warning: 'DATA EXFILTRATION via DNS subdomain!', modifiable: ['question.name'] }
          },
          
          { from: 'firewall', to: 'resolver', label: 'Firewall Allows DNS', malicious: true,
            packetData: { type: 'DNS Query (Forwarded)', 
              firewallRule: 'ALLOW outbound port 53 (DNS)', 
              inspection: 'Deep packet inspection: SKIPPED (DNS trusted)',
              query: '4a7b3f9e2d1c.8f6e4d2a1b9c.evil-domain.com',
              hiddenPayload: 'username:admin,password:secret123',
              warning: 'Firewall allows - tunnel established!' }
          }
        ],
        3: [
          
          { from: 'client', to: 'firewall', label: 'DNS Query (Port 53)', malicious: true,
            packetData: { type: 'DNS Query', port: 53, protocol: 'UDP', 
              destination: '8.8.8.8 (Google DNS)',
              firewallRule: 'ALLOW outbound port 53 (DNS)', 
              inspection: 'Deep packet inspection: SKIPPED (DNS trusted)',
              bypass: true,
              warning: 'Firewall allows all DNS - tunnel established!' }
          },
          
          { from: 'firewall', to: 'resolver', label: 'Passed Firewall ✓', malicious: true,
            packetData: { type: 'DNS Query (Uninspected)', 
              status: 'Firewall bypassed successfully', 
              hiddenPayload: '4a7b3f9e2d1c.8f6e4d2a1b9c',
              warning: 'Covert channel active!' }
          }
        ],
        4: [
          
          { from: 'resolver', to: 'attacker', label: 'Query to Attacker\'s NS', malicious: true,
            packetData: { type: 'DNS Query (Forwarded to Authoritative)', 
              query: '4a7b3f9e2d1c.8f6e4d2a1b9c.evil-domain.com',
              authoritative: 'ns1.evil-domain.com (Attacker controls this)',
              destination: 'Attacker\'s server (acts as DNS server)',
              extractedData: '4a7b3f9e2d1c.8f6e4d2a1b9c', 
              decodedData: 'username:admin,password:secret123',
              warning: 'Data successfully exfiltrated to attacker!' }
          }
        ],
        5: [
          
          { from: 'attacker', to: 'resolver', label: 'TXT Record with C2 Commands', malicious: true,
            packetData: { type: 'DNS TXT Response', transactionID: '0x7777', 
              answer: { type: 'TXT', name: '4a7b3f9e2d1c.8f6e4d2a1b9c.evil-domain.com',
                data: 'v=c2;cmd=exec;payload=ZG93bmxvYWRfcmFuc29td2FyZS5leGU=' }, 
              encodedCommand: 'Base64: ZG93bmxvYWRfcmFuc29td2FyZS5leGU=', 
              decodedCommand: 'download_ransomware.exe',
              commandType: 'Execute malware',
              warning: 'MALWARE COMMAND in DNS response!' }
          },
          
          { from: 'resolver', to: 'client', label: 'TXT Response to Client', malicious: true,
            packetData: { type: 'DNS TXT Response (C2 Command Delivery)', 
              transactionID: '0x7777',
              txtRecord: 'v=c2;cmd=exec;payload=ZG93bmxvYWRfcmFuc29td2FyZS5leGU=',
              malwareAction: 'Execute: download_ransomware.exe',
              stealthLevel: 'HIGH (Looks like normal DNS)',
              warning: 'Client executes attacker commands!', modifiable: ['answer.data'] }
          }
        ]
      },

      
      'nxdomain-flood': {
        1: [
          
          { from: 'attacker', to: 'botnet', label: 'Attack Command', malicious: true,
            packetData: { type: 'C2 Command', command: 'START_NXDOMAIN_FLOOD', 
              target: '8.8.8.8 (Google DNS)', rate: '10M queries/sec', 
              botCount: '50,000 infected devices', 
              dgaAlgorithm: 'Generate random domains (DGA)',
              warning: 'Botnet activated!' }
          }
        ],
        2: [
          
          { from: 'botnet', to: 'resolver', label: 'Random Query #1', malicious: true,
            packetData: { type: 'DNS Query', question: { name: '8f3k2j9d.com', type: 'A' }, 
              generated: 'DGA Algorithm', exists: false, bot: 'Bot #1 (203.0.113.10)' }
          },
          { from: 'botnet', to: 'resolver', label: 'Random Query #2', malicious: true,
            packetData: { type: 'DNS Query', question: { name: 'x9q2m4p1.net', type: 'A' }, 
              generated: 'DGA Algorithm', exists: false, bot: 'Bot #2 (203.0.113.11)' }
          },
          { from: 'botnet', to: 'resolver', label: 'Random Query #3', malicious: true,
            packetData: { type: 'DNS Query', question: { name: 'k4f7m2n8.org', type: 'A' }, 
              generated: 'DGA Algorithm', exists: false, bot: 'Bot #3 (203.0.113.12)' }
          },
          { from: 'botnet', to: 'resolver', label: '...9,999,997 more/sec', malicious: true,
            packetData: { type: 'Query Flood', rate: '10,000,000 queries/sec', 
              uniqueDomains: 'All different (no cache)', warning: 'MASSIVE FLOOD!' }
          }
        ],
        3: [
          
          { from: 'resolver', to: 'auth-server', label: 'Forward Random Query', malicious: false,
            packetData: { type: 'Recursive Query', question: { name: '8f3k2j9d.com' }, 
              cacheStatus: 'MISS (never queried before)', mustForward: true,
              warning: 'Every unique query hits authoritative server!' }
          },
          
          { from: 'auth-server', to: 'resolver', label: 'NXDOMAIN Response', malicious: false,
            packetData: { type: 'DNS Response', rcode: 'NXDOMAIN (3)', 
              meaning: 'Domain does not exist', 
              negativeCacheTTL: '300 seconds', 
              problem: 'But next query is different domain!',
              warning: 'Resolver overwhelmed by unique queries!' }
          },
          
          { from: 'resolver', to: 'botnet', label: 'NXDOMAIN to Bot', malicious: false,
            packetData: { type: 'DNS Response', rcode: 'NXDOMAIN', 
              cost: 'CPU cycles wasted', queueBacklog: 'Growing...', 
              warning: 'Resolver resources draining!' }
          }
        ],
        4: [
          
          { from: 'resolver', to: 'resolver', label: 'Resource Exhaustion', malicious: true,
            packetData: { type: 'System State', 
              cpuUsage: '100% (all cores)', 
              memoryUsage: '98% (query queue)', 
              queuedQueries: '500,000 backlog', 
              socketLimit: '65,535 sockets (EXHAUSTED)', 
              threadPool: '1,000 threads (MAX)',
              responseTime: '30+ seconds (timeout)',
              droppedPackets: '80% packet loss',
              warning: 'RESOLVER OVERLOADED - Cannot handle legitimate traffic!' }
          }
        ],
        5: [
          
          { from: 'client', to: 'resolver', label: 'Legitimate Query', malicious: false,
            packetData: { type: 'DNS Query', question: { name: 'google.com', type: 'A' }, 
              sourceIP: '192.168.1.150', user: 'Legitimate user',
              timeout: '5 seconds', status: 'Waiting...' }
          },
          
          { from: 'resolver', to: 'client', label: '❌ TIMEOUT (No Response)', malicious: true,
            packetData: { type: 'Timeout', 
              waited: '5 seconds', 
              status: 'NO RESPONSE - Resolver overwhelmed', 
              userImpact: 'Cannot browse internet',
              errorMessage: 'DNS_PROBE_FINISHED_NO_INTERNET',
              warning: 'DNS SERVICE FAILURE - Attack successful!' }
          }
        ]
      },

      
      'subdomain-takeover': {
        1: [
          
          { from: 'company', to: 'dns', label: 'Misconfigured CNAME', malicious: false,
            packetData: { type: 'DNS Configuration', 
              record: 'blog.acmecorp.com CNAME acme-blog.s3.amazonaws.com',
              problem: 'S3 bucket "acme-blog" was deleted 6 months ago',
              status: 'DANGLING CNAME - Vulnerable!',
              cveReference: 'CWE-350: Reliance on Reverse DNS Resolution',
              warning: 'DNS record points to unclaimed resource!' }
          }
        ],
        2: [
          
          { from: 'client', to: 'dns', label: 'Resolve blog.acmecorp.com', malicious: false,
            packetData: { type: 'DNS Query', question: { name: 'blog.acmecorp.com', type: 'A' },
              transactionID: '0x9abc' }
          },
          
          { from: 'dns', to: 'cloud', label: 'Follow CNAME Chain', malicious: false,
            packetData: { type: 'DNS CNAME Resolution', 
              query: 'blog.acmecorp.com', 
              cname: 'acme-blog.s3.amazonaws.com', 
              nextQuery: 'Resolve acme-blog.s3.amazonaws.com' }
          },
          
          { from: 'cloud', to: 'dns', label: 'NoSuchBucket (404)', malicious: false,
            packetData: { type: 'AWS S3 Response', 
              status: 'NoSuchBucket (404)', 
              bucket: 'acme-blog',
              message: 'The specified bucket does not exist',
              vulnerability: 'ANYONE can claim this bucket name!',
              warning: 'Dangling CNAME detected - attackers can takeover!' }
          },
          
          { from: 'dns', to: 'client', label: 'Resolution Failed', malicious: false,
            packetData: { type: 'DNS Error', rcode: 'SERVFAIL (2)',
              reason: 'CNAME target unreachable',
              userImpact: 'Page doesn\'t load (currently)' }
          }
        ],
        3: [
          
          { from: 'attacker', to: 'dns', label: 'Scan for CNAMEs', malicious: true,
            packetData: { type: 'Reconnaissance', 
              tool: 'SubOver, Can I Take Over XYZ',
              scan: 'blog.acmecorp.com → CNAME acme-blog.s3.amazonaws.com',
              check: 'Test if S3 bucket exists',
              result: 'NoSuchBucket - VULNERABLE!',
              warning: 'Attacker found dangling CNAME!' }
          }
        ],
        4: [
          
          { from: 'attacker', to: 'cloud', label: 'Create S3 Bucket', malicious: true,
            packetData: { type: 'AWS API Request', 
              method: 'CreateBucket', 
              bucketName: 'acme-blog', 
              region: 'us-east-1', 
              owner: 'attacker@evil.com',
              publicAccess: 'Enabled (hosts phishing page)',
              indexHtml: 'Phishing login page mimicking acmecorp.com',
              status: 'SUCCESS - Bucket claimed!', 
              warning: 'TAKEOVER COMPLETE - Attacker owns blog.acmecorp.com!' }
          }
        ],
        5: [
          
          { from: 'client', to: 'dns', label: 'Resolve blog.acmecorp.com', malicious: false,
            packetData: { type: 'DNS Query', question: { name: 'blog.acmecorp.com', type: 'A' },
              user: 'Legitimate visitor' }
          },
          
          { from: 'dns', to: 'cloud', label: 'Follow CNAME', malicious: false,
            packetData: { type: 'CNAME Resolution', 
              chain: 'blog.acmecorp.com → acme-blog.s3.amazonaws.com' }
          },
          
          { from: 'cloud', to: 'dns', label: 'Resolve to Attacker\'s IP', malicious: true,
            packetData: { type: 'AWS S3 Resolution', 
              bucket: 'acme-blog (NOW EXISTS)', 
              owner: 'attacker@evil.com',
              ipAddress: '52.216.1.66 (Attacker\'s server)',
              status: 'SUCCESS',
              warning: 'Bucket now controlled by attacker!' }
          },
          
          { from: 'dns', to: 'client', label: 'Attacker\'s IP', malicious: true,
            packetData: { type: 'DNS Response', 
              answer: { name: 'blog.acmecorp.com', type: 'A', data: '52.216.1.66 (Attacker)' },
              cname: 'acme-blog.s3.amazonaws.com',
              trustLevel: 'HIGH (users trust blog.acmecorp.com domain)',
              content: 'Phishing page with acmecorp.com branding',
              warning: 'User connects to attacker\'s phishing site on trusted domain!' }
          }
        ]
      }
    };

    return flows[attackId]?.[step] || [];
  };

  const handlePacketClick = (packetData, flow) => {
    setSelectedPacket({
      ...packetData,
      flow: flow
    });
    setModifiedPacketData(JSON.parse(JSON.stringify(packetData)));
    setShowPacketModal(true);
  };

  const handlePacketFieldChange = (field, value) => {
    console.log('Field change:', field, 'New value:', value);
    setModifiedPacketData(prev => {
      console.log('Previous data:', prev);
      const updated = JSON.parse(JSON.stringify(prev)); 
      
      if (field.includes('.')) {
        const parts = field.split('.');
        let current = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        updated[field] = value;
      }
      
      console.log('Updated data:', updated);
      return updated;
    });
  };

  const applyPacketModification = () => {
    console.log('Applying modification...');
    console.log('Selected Packet:', selectedPacket);
    console.log('Modified Packet Data:', modifiedPacketData);
    
    const originalStr = JSON.stringify(selectedPacket, null, 2);
    const modifiedStr = JSON.stringify(modifiedPacketData, null, 2);
    
    alert(`Packet Modified!\n\nOriginal:\n${originalStr}\n\nModified:\n${modifiedStr}\n\nIn a real attack, this would change the outcome!`);
    setShowPacketModal(false);
  };

  const getNestedValue = (obj, path) => {
    if (!obj) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      if (current[part] === undefined) return undefined;
      current = current[part];
    }
    return current;
  };

  const renderPacketModal = () => {
    if (!showPacketModal || !selectedPacket) return null;

    return (
      <div className="packet-modal-overlay" onClick={() => setShowPacketModal(false)}>
        <div className="packet-modal" onClick={(e) => e.stopPropagation()}>
          <div className="packet-modal-header">
            <div>
              <h3>📦 Packet Inspector</h3>
              <p className="packet-type">
                {selectedPacket.malicious && '⚠️ MALICIOUS '}
                {selectedPacket.poisoned && '☠️ POISONED '}
                {selectedPacket.type}
              </p>
            </div>
            <button className="modal-close-btn" onClick={() => setShowPacketModal(false)}>✕</button>
          </div>

          <div className="packet-modal-content">
            {}
            <div className="packet-details">
              <h4>📋 Packet Details</h4>
              <div className="packet-fields-display">
                {renderPacketFieldsDisplay(modifiedPacketData || selectedPacket, true)}
              </div>
            </div>

            {}
            {selectedPacket.warning && (
              <div className="packet-warning">
                <strong>⚠️ Warning:</strong> {selectedPacket.warning}
              </div>
            )}

            {}
            <div className="packet-education">
              <h4>💡 Understanding This Packet</h4>
              {renderPacketEducation(selectedPacket)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPacketFieldsDisplay = (packet, isEditable) => {
    if (!packet) return <p style={{ color: '#9ca3af', padding: '20px', textAlign: 'center' }}>No packet data</p>;
    
    const fields = [];
    const modifiableFields = selectedPacket?.modifiable || [];

    const renderField = (key, value, path = '') => {
      const fieldPath = path ? `${path}.${key}` : key;
      const isModifiable = modifiableFields.includes(fieldPath);
      
      
      const currentValue = isEditable ? getNestedValue(modifiedPacketData, fieldPath) : value;
      const originalValue = getNestedValue(selectedPacket, fieldPath);
      const isModified = isEditable && JSON.stringify(currentValue) !== JSON.stringify(originalValue);
      const isDangerous = selectedPacket?.malicious && (key.includes('IP') || key === 'answer' || key === 'data');

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <div key={fieldPath} className="nested-field">
            <div className="field-group-label">{formatFieldName(key)}:</div>
            {Object.entries(value).map(([k, v]) => renderField(k, v, fieldPath))}
          </div>
        );
      }

      return (
        <div key={fieldPath} className={`packet-field-item ${isDangerous ? 'dangerous' : ''} ${isModified ? 'modified' : ''}`}>
          <label>
            {isDangerous && '⚠️ '}
            {formatFieldName(key)}:
          </label>
          {isEditable && isModifiable ? (
            <input
              type="text"
              value={currentValue !== undefined ? String(currentValue) : String(value)}
              onChange={(e) => handlePacketFieldChange(fieldPath, e.target.value)}
              className="packet-input"
            />
          ) : (
            <span className="field-value">{String(value)}</span>
          )}
          {isModified && <span className="modified-badge">✏️ Modified</span>}
        </div>
      );
    };

    Object.entries(packet).forEach(([key, value]) => {
      if (['type', 'warning', 'modifiable', 'flow', 'malicious', 'poisoned', 'cached'].includes(key)) return;
      fields.push(renderField(key, value));
    });

    return fields;
  };

  const renderPacketEducation = (packet) => {
    if (packet.type === 'Forged DNS Response') {
      return (
        <div className="education-content">
          <p><strong>How Cache Poisoning Works:</strong></p>
          <ul>
            <li>Attacker guesses the Transaction ID (1 in 65,536 chance)</li>
            <li>Sends forged response before legitimate server responds</li>
            <li>If Transaction ID matches, resolver accepts the fake response</li>
            <li>Malicious IP gets cached and served to all users</li>
          </ul>
          <p className="try-it"><strong>Try modifying:</strong> Change the Transaction ID to see how matching affects acceptance!</p>
        </div>
      );
    }

    if (packet.type === 'Spoofed DNS Query') {
      return (
        <div className="education-content">
          <p><strong>How Amplification Works:</strong></p>
          <ul>
            <li>Attacker sends small query (60 bytes) with spoofed source IP</li>
            <li>DNS server responds with large answer (4000 bytes) to victim</li>
            <li>Traffic amplified 50x - victim receives massive unsolicited data</li>
            <li>Repeated across thousands of servers = DDoS attack</li>
          </ul>
          <p className="try-it"><strong>Try modifying:</strong> Change query type to see how response size changes!</p>
        </div>
      );
    }

    if (packet.type === 'Fake DNS Response') {
      return (
        <div className="education-content">
          <p><strong>How MITM Works:</strong></p>
          <ul>
            <li>Attacker controls WiFi network (or is on same network)</li>
            <li>Intercepts DNS queries from victims</li>
            <li>Sends fake response with attacker's server IP</li>
            <li>User connects to phishing site instead of real site</li>
          </ul>
          <p className="try-it"><strong>Try modifying:</strong> Change the fake IP to your own server!</p>
        </div>
      );
    }

    return (
      <div className="education-content">
        <p>This is a DNS packet. Click on different packets to see how attacks modify them!</p>
      </div>
    );
  };

  const startSimulation = (attackId) => {
    setSelectedAttack(attackId);
    setShowBrief(true);
    setSimulationStep(0);
  };

  const startActualSimulation = () => {
    setShowBrief(false);
  };

  const nextStep = () => {
    const steps = getAttackSteps(selectedAttack);
    if (simulationStep < steps.length - 1) {
      setSimulationStep(simulationStep + 1);
    }
  };

  const prevStep = () => {
    if (simulationStep > 0) {
      setSimulationStep(simulationStep - 1);
      setInterceptionPhase(0); // Reset interception when changing steps
    }
  };

  const advanceInterception = () => {
    setInterceptionPhase(interceptionPhase + 1);
  };

  // Render Attack Brief Panel
  const renderAttackBrief = () => {
    const attack = attacks.find(a => a.id === selectedAttack);
    if (!attack) return null;

    const steps = getAttackSteps(selectedAttack);
    const attackStepCount = steps.length;

    return (
      <div className="attack-brief-overlay">
        <div className="attack-brief-panel">
          <div className="brief-header" style={{ background: `linear-gradient(135deg, ${attack.color}, ${attack.color}dd)` }}>
            <div className="brief-icon">{attack.icon}</div>
            <h2>{attack.name}</h2>
            <div className="brief-meta">
              <span className={`severity-badge ${attack.severity.toLowerCase()}`}>
                ⚠️ {attack.severity} Severity
              </span>
              <span className="difficulty-badge">
                🎯 Difficulty: {attack.difficulty}
              </span>
            </div>
          </div>

          <div className="brief-content">
            {/* Description Section */}
            <div className="brief-section">
              <h3>📋 Attack Overview</h3>
              <p className="overview-text">{attack.description}</p>
            </div>

            {/* Impact Section */}
            <div className="brief-section impact-section">
              <h3>💥 Impact & Consequences</h3>
              <div className="impact-box">
                <p>{attack.impact}</p>
              </div>
            </div>

            {/* Real-World Example */}
            {attack.realWorldExample && (
              <div className="brief-section realworld-section">
                <h3>🌍 Real-World Examples</h3>
                <div className="realworld-box">
                  <p>{attack.realWorldExample}</p>
                </div>
              </div>
            )}

            {/* Attack Flow Preview */}
            <div className="brief-section flow-section">
              <h3>🔄 Simulation Flow ({attackStepCount} Steps)</h3>
              <div className="flow-preview">
                {steps.map((step, idx) => (
                  <div key={idx} className="flow-step-preview">
                    <div className="step-number" style={{ borderColor: attack.color }}>
                      {idx + 1}
                    </div>
                    <div className="step-preview-content">
                      <h4>{step.title}</h4>
                      <p>{step.description.substring(0, 80)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Concepts */}
            <div className="brief-section concepts-section">
              <h3>🔑 Key Concepts</h3>
              <div className="concepts-grid">
                {selectedAttack === 'cache-poisoning' && (
                  <>
                    <div className="concept-card">
                      <strong>Race Condition</strong>
                      <p>Attacker must respond faster than legitimate server</p>
                    </div>
                    <div className="concept-card">
                      <strong>Transaction ID</strong>
                      <p>16-bit random number - attacker must guess correctly</p>
                    </div>
                    <div className="concept-card">
                      <strong>Cache Corruption</strong>
                      <p>Malicious DNS records stored for hours/days</p>
                    </div>
                    <div className="concept-card">
                      <strong>Modern Mitigations</strong>
                      <p>DNSSEC, source port randomization, DoH/DoT</p>
                    </div>
                  </>
                )}
                {selectedAttack === 'mitm' && (
                  <>
                    <div className="concept-card">
                      <strong>Evil Twin AP</strong>
                      <p>Rogue WiFi mimics legitimate access point</p>
                    </div>
                    <div className="concept-card">
                      <strong>Traffic Interception</strong>
                      <p>All DNS queries pass through attacker</p>
                    </div>
                    <div className="concept-card">
                      <strong>Response Manipulation</strong>
                      <p>Returns malicious IP instead of real address</p>
                    </div>
                    <div className="concept-card">
                      <strong>Protection</strong>
                      <p>Use VPN, HTTPS, verify certificates</p>
                    </div>
                  </>
                )}
                {selectedAttack === 'amplification' && (
                  <>
                    <div className="concept-card">
                      <strong>IP Spoofing</strong>
                      <p>Forged source IP to victim's address</p>
                    </div>
                    <div className="concept-card">
                      <strong>Amplification Factor</strong>
                      <p>Small query → 100x larger response</p>
                    </div>
                    <div className="concept-card">
                      <strong>Open Resolvers</strong>
                      <p>Misconfigured DNS servers abused as amplifiers</p>
                    </div>
                    <div className="concept-card">
                      <strong>Mitigation</strong>
                      <p>Rate limiting, BCP38, close open resolvers</p>
                    </div>
                  </>
                )}
                {selectedAttack === 'tunneling' && (
                  <>
                    <div className="concept-card">
                      <strong>Data Encoding</strong>
                      <p>Hide data in DNS query subdomain names</p>
                    </div>
                    <div className="concept-card">
                      <strong>C2 Channel</strong>
                      <p>Command & Control via TXT/NULL records</p>
                    </div>
                    <div className="concept-card">
                      <strong>Firewall Bypass</strong>
                      <p>DNS typically allowed through all firewalls</p>
                    </div>
                    <div className="concept-card">
                      <strong>Detection</strong>
                      <p>Anomalous query patterns, long subdomains</p>
                    </div>
                  </>
                )}
                {selectedAttack === 'nxdomain-flood' && (
                  <>
                    <div className="concept-card">
                      <strong>Random Subdomains</strong>
                      <p>Query non-existent names to bypass cache</p>
                    </div>
                    <div className="concept-card">
                      <strong>Resource Exhaustion</strong>
                      <p>Overwhelm resolver with failed lookups</p>
                    </div>
                    <div className="concept-card">
                      <strong>Botnet Scale</strong>
                      <p>Millions of queries per second</p>
                    </div>
                    <div className="concept-card">
                      <strong>Defense</strong>
                      <p>Rate limiting, behavioral analysis, anycast</p>
                    </div>
                  </>
                )}
                {selectedAttack === 'subdomain-takeover' && (
                  <>
                    <div className="concept-card">
                      <strong>Dangling CNAME</strong>
                      <p>DNS points to unclaimed cloud resource</p>
                    </div>
                    <div className="concept-card">
                      <strong>Resource Claiming</strong>
                      <p>Attacker registers abandoned service</p>
                    </div>
                    <div className="concept-card">
                      <strong>Trust Exploitation</strong>
                      <p>Host malicious content on trusted domain</p>
                    </div>
                    <div className="concept-card">
                      <strong>Prevention</strong>
                      <p>Regular DNS audits, delete unused records</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {}
            {attack.historicalNote && (
              <div className="brief-section historical-note">
                <h3>⚠️ Important Historical Context</h3>
                <div className="warning-box">
                  <p><strong>This simulation demonstrates a 2008-era attack.</strong> Modern DNS infrastructure (2024) has robust defenses:</p>
                  <ul>
                    <li>✅ <strong>DNSSEC</strong> - Cryptographic validation of DNS responses</li>
                    <li>✅ <strong>Source Port Randomization</strong> - 65,536 ports instead of predictable port 53</li>
                    <li>✅ <strong>DNS-over-HTTPS (DoH)</strong> - Encrypted DNS prevents interception</li>
                    <li>✅ <strong>DNS-over-TLS (DoT)</strong> - Transport layer encryption</li>
                    <li>✅ <strong>0x20 Encoding</strong> - Case randomization adds entropy</li>
                  </ul>
                  <p className="disclaimer">This simulation is for <strong>educational purposes only</strong> to understand historical DNS vulnerabilities.</p>
                </div>
              </div>
            )}

            {}
            <div className="brief-actions">
              <button 
                className="back-to-list-btn" 
                onClick={() => {
                  setSelectedAttack(null);
                  setShowBrief(false);
                }}
              >
                ← Back to Attack List
              </button>
              <button 
                className="start-simulation-btn" 
                onClick={startActualSimulation}
                style={{ background: `linear-gradient(135deg, ${attack.color}, ${attack.color}dd)` }}
              >
                ▶ Start Interactive Simulation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPacketDetails = () => {
    const currentStep = getAttackSteps(selectedAttack)[simulationStep];
    if (!currentStep) return null;

    const actorDefinitions = {
      'client': { icon: '💻', label: 'Client', color: '#3b82f6' },
      'attacker': { icon: '🦹', label: 'Attacker', color: '#ef4444' },
      'resolver': { icon: '🔄', label: 'DNS Resolver', color: '#8b5cf6' },
      'victim': { icon: '😱', label: 'Victim', color: '#f59e0b' },
      'auth-server': { icon: '📋', label: 'Auth Server', color: '#10b981' },
      'wifi': { icon: '📡', label: 'WiFi Hotspot', color: '#6366f1' },
      'fake-server': { icon: '🎭', label: 'Fake Server', color: '#dc2626' },
      'firewall': { icon: '🛡️', label: 'Firewall', color: '#64748b' },
      'cloud': { icon: '☁️', label: 'Cloud Service', color: '#06b6d4' },
      'company': { icon: '🏢', label: 'Company', color: '#10b981' },
      'dns': { icon: '🌐', label: 'DNS Server', color: '#8b5cf6' },
      'botnet': { icon: '🤖', label: 'Botnet', color: '#dc2626' }
    };

    
    const activeActors = currentStep.actors || [];
    const packetsToShow = [];

    activeActors.forEach(actorId => {
      const packetData = getPacketData(selectedAttack, currentStep.step, actorId);
      if (packetData) {
        const actor = actorDefinitions[actorId];
        packetsToShow.push({
          actorId,
          actor,
          data: packetData
        });
      }
    });

    if (packetsToShow.length === 0) {
      return (
        <div className="packet-details-panel">
          <h3>📦 Packet Details</h3>
          <div className="no-packets">
            <p>No packet data available for this step</p>
          </div>
        </div>
      );
    }

    return (
      <div className="packet-details-panel">
        <h3>📦 Packet Flow & Details - Step {currentStep.step}</h3>
        <p className="step-description">{currentStep.description}</p>
        
        <div className="packets-grid">
          {packetsToShow.map(({ actorId, actor, data }) => (
            <div key={actorId} className="packet-card">
              <div className="packet-card-header" style={{ borderColor: actor.color }}>
                <span className="actor-icon">{actor.icon}</span>
                <span className="actor-label">{actor.label}</span>
              </div>

              {data.before && (
                <div className="packet-state before-state">
                  <h4>⏮️ Before</h4>
                  {renderPacketState(data.before, false)}
                </div>
              )}

              {data.after && (
                <div className="packet-state after-state">
                  <h4>⏭️ After</h4>
                  {renderPacketState(data.after, data.after.danger)}
                </div>
              )}

              {!data.before && !data.after && (
                <div className="packet-state">
                  {renderPacketState(data, data.danger || data.malicious)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPacketState = (state, isDangerous = false) => {
    return (
      <div className={`packet-state-content ${isDangerous ? 'dangerous' : ''}`}>
        {Object.entries(state).map(([key, value]) => {
          
          if (key === 'danger' || key === 'malicious' || key === 'poisoned') return null;

          const isDangerousField = typeof value === 'string' && 
            (value.includes('⚠️') || value.includes('MALICIOUS') || value.includes('FAKE') || value.includes('SPOOFED'));

          return (
            <div key={key} className={`packet-field ${isDangerousField ? 'dangerous-field' : ''}`}>
              <span className="field-key">{formatFieldName(key)}:</span>
              <span className="field-value">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </span>
            </div>
          );
        })}
        
        {state.impact && (
          <div className="impact-warning">
            <strong>⚠️ Impact:</strong> {state.impact}
          </div>
        )}
      </div>
    );
  };

  const formatFieldName = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/Ip/g, 'IP')
      .replace(/Dns/g, 'DNS')
      .replace(/Ttl/g, 'TTL')
      .replace(/Id/g, 'ID');
  };

  return (
    <div className="attack-scenarios-overlay">
      {renderPacketModal()}
      
      {}
      {selectedAttack && showBrief && renderAttackBrief()}
      
      {}
      {!showBrief && (
        <div className="attack-scenarios-panel">
          <div className="attack-header">
            <h2>🛡️ DNS Attack Scenarios</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          {!selectedAttack ? (
          <div className="attack-grid">
            {attacks.map(attack => (
              <div
                key={attack.id}
                className="attack-card"
                onClick={() => startSimulation(attack.id)}
                style={{ borderColor: attack.color }}
              >
                <div className="attack-icon" style={{ background: `linear-gradient(135deg, ${attack.color}, ${attack.color}dd)` }}>
                  {attack.icon}
                </div>
                <h3>{attack.name}</h3>
                <div className="attack-meta">
                  <span className={`severity ${attack.severity.toLowerCase()}`}>
                    {attack.severity}
                  </span>
                  <span className="difficulty">{attack.difficulty}</span>
                </div>
                <p className="attack-description">{attack.description}</p>
                <p className="attack-impact">
                  <strong>Impact:</strong> {attack.impact}
                </p>
                {attack.realWorldExample && (
                  <p className="attack-real-world">
                    <strong>🌍 Real-World:</strong> {attack.realWorldExample}
                  </p>
                )}
                <button className="simulate-btn" style={{ backgroundColor: attack.color }}>
                  ▶ Start Simulation
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="simulation-view">
            <div className="simulation-header">
              <button className="back-btn" onClick={() => setSelectedAttack(null)}>
                ← Back to Attacks
              </button>
              <h3>{attacks.find(a => a.id === selectedAttack)?.name}</h3>
            </div>

            <div className="simulation-content">
              {}
              <div className="visualization-section">
                <div className="visualization-container">
                  <svg ref={svgRef} className="attack-svg"></svg>
                  {}
                  
                </div>
              </div>

              {}
              <div className="control-panel-section">
                <div className="control-panel-content">
                  {}
                  <div className="step-info">
                    {getAttackSteps(selectedAttack)[simulationStep] && (
                      <>
                        <h4>Step {simulationStep + 1}/{getAttackSteps(selectedAttack).length}: {getAttackSteps(selectedAttack)[simulationStep].title}</h4>
                        <p>{getAttackSteps(selectedAttack)[simulationStep].description}</p>
                        {getAttackSteps(selectedAttack)[simulationStep].technicalDetails && (
                          <div className="technical-details">
                            <strong>🔬 Technical Details:</strong>
                            <p>{getAttackSteps(selectedAttack)[simulationStep].technicalDetails}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {}
                  <div className="simulation-controls">
                    <>
                      <button onClick={prevStep} disabled={simulationStep === 0} className="nav-btn">
                        ⏮ Back
                      </button>
                      <span className="step-counter">
                        Step {simulationStep + 1} / {getAttackSteps(selectedAttack).length}
                      </span>
                      <button onClick={nextStep} disabled={simulationStep >= getAttackSteps(selectedAttack).length - 1} className="nav-btn">
                        Next ⏭
                      </button>
                    </>
                  </div>

                 
                </div>
              </div>
            </div>

            {}
            {selectedNode && (
              <div className="node-details-overlay" onClick={() => setSelectedNode(null)}>
                <div className="node-details-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="node-details-header">
                    <div className="node-details-title">
                      <span className="node-icon-large">
                        {selectedNode.nodeId === 'client' && '💻'}
                        {selectedNode.nodeId === 'attacker' && '🦹'}
                        {selectedNode.nodeId === 'resolver' && '🔄'}
                        {selectedNode.nodeId === 'victim' && '😱'}
                        {selectedNode.nodeId === 'auth-server' && '📋'}
                        {selectedNode.nodeId === 'wifi' && '📡'}
                        {selectedNode.nodeId === 'fake-server' && '🎭'}
                        {selectedNode.nodeId === 'firewall' && '🛡️'}
                        {selectedNode.nodeId === 'cloud' && '☁️'}
                        {selectedNode.nodeId === 'company' && '🏢'}
                        {selectedNode.nodeId === 'dns' && '🌐'}
                        {selectedNode.nodeId === 'botnet' && '🤖'}
                      </span>
                      <div>
                        <h3>
                          {selectedNode.nodeId === 'client' && 'Client'}
                          {selectedNode.nodeId === 'attacker' && 'Attacker'}
                          {selectedNode.nodeId === 'resolver' && 'DNS Resolver'}
                          {selectedNode.nodeId === 'victim' && 'Victim'}
                          {selectedNode.nodeId === 'auth-server' && 'Auth Server'}
                          {selectedNode.nodeId === 'wifi' && 'WiFi Hotspot'}
                          {selectedNode.nodeId === 'fake-server' && 'Fake Server'}
                          {selectedNode.nodeId === 'firewall' && 'Firewall'}
                          {selectedNode.nodeId === 'cloud' && 'Cloud Service'}
                          {selectedNode.nodeId === 'company' && 'Company'}
                          {selectedNode.nodeId === 'dns' && 'DNS Server'}
                          {selectedNode.nodeId === 'botnet' && 'Botnet'}
                        </h3>
                        <p className="node-subtitle">Step {selectedNode.step} - Packet Details</p>
                      </div>
                    </div>
                    <button className="close-node-details" onClick={() => setSelectedNode(null)}>×</button>
                  </div>
                  <div className="node-details-content">
                    {selectedNode.data.before && (
                      <div className="node-details-section">
                        <h4 className="before-label">⏮️ Before</h4>
                        <div className="node-details-fields">
                          {Object.entries(selectedNode.data.before).map(([key, value]) => {
                            if (key === 'danger' || key === 'malicious' || key === 'poisoned') return null;
                            const isDangerous = typeof value === 'string' && 
                              (value.includes('⚠️') || value.includes('MALICIOUS') || value.includes('FAKE') || value.includes('SPOOFED'));
                            
                            return (
                              <div key={key} className={`node-detail-field ${isDangerous ? 'dangerous' : ''}`}>
                                <span className="detail-label">{formatFieldName(key)}:</span>
                                <span className="detail-value">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.data.after && (
                      <div className="node-details-section">
                        <h4 className={`after-label ${selectedNode.data.after.danger ? 'danger' : ''}`}>⏭️ After</h4>
                        <div className="node-details-fields">
                          {Object.entries(selectedNode.data.after).map(([key, value]) => {
                            if (key === 'danger' || key === 'malicious' || key === 'poisoned') return null;
                            const isDangerous = typeof value === 'string' && 
                              (value.includes('⚠️') || value.includes('MALICIOUS') || value.includes('FAKE') || value.includes('SPOOFED') || value.includes('🔴'));
                            
                            return (
                              <div key={key} className={`node-detail-field ${isDangerous ? 'dangerous' : ''}`}>
                                <span className="detail-label">{formatFieldName(key)}:</span>
                                <span className="detail-value">
                                  {typeof value === 'object' ? (
                                    <pre>{JSON.stringify(value, null, 2)}</pre>
                                  ) : (
                                    String(value)
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!selectedNode.data.before && !selectedNode.data.after && (
                      <div className="node-details-section">
                        <div className="node-details-fields">
                          {Object.entries(selectedNode.data).map(([key, value]) => {
                            if (key === 'danger' || key === 'malicious' || key === 'poisoned') return null;
                            const isDangerous = typeof value === 'string' && 
                              (value.includes('⚠️') || value.includes('MALICIOUS') || value.includes('FAKE') || value.includes('SPOOFED'));
                            
                            return (
                              <div key={key} className={`node-detail-field ${isDangerous ? 'dangerous' : ''}`}>
                                <span className="detail-label">{formatFieldName(key)}:</span>
                                <span className="detail-value">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export default AttackScenariosPanel;
