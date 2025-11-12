import React, { useState, useRef } from 'react';
import '../styles/ResultsPanel.css';
import '../styles/LiveDataEnhanced.css';


function ResultsPanel({ results, config = {} }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [packetFormat, setPacketFormat] = useState('human'); 
  const [showWhatThisMeans, setShowWhatThisMeans] = useState({});
  const [showImpactAnalysis, setShowImpactAnalysis] = useState({});
  const [expandedDNSSEC, setExpandedDNSSEC] = useState({});
  const copyNotificationRef = useRef(null);

  if (!results) return null;

  const toggleStep = (index) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  const toggleWhatThisMeans = (index) => {
    setShowWhatThisMeans(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleImpactAnalysis = (index) => {
    setShowImpactAnalysis(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  const formatHex = (obj) => {
    const jsonStr = JSON.stringify(obj);
    let hex = '';
    let offset = 0;

    for (let i = 0; i < jsonStr.length; i += 16) {
      const chunk = jsonStr.slice(i, i + 16);
      const hexChunk = Array.from(chunk)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ');
      const asciiChunk = chunk.replace(/[^\x20-\x7E]/g, '.');
      hex += `0x${offset.toString(16).padStart(4, '0')}: ${hexChunk.padEnd(48, ' ')} | ${asciiChunk}\n`;
      offset += 16;
    }
    return hex;
  };

  const formatWire = (packet) => {
    if (!packet || !packet.flags) return 'No packet data available';

    const flags = packet.flags;
    return `
DNS Packet Wire Format:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header Section:
  Transaction ID: 0x${(packet.id || 0).toString(16).padStart(4, '0')}

  Flags (16 bits):
    QR (Query/Response):        ${flags.qr} ${flags.qr ? '(Response)' : '(Query)'}
    OPCODE (Operation):         ${flags.opcode} (Standard Query)
    AA (Authoritative Answer):  ${flags.aa} ${flags.aa ? '(Authoritative)' : '(Non-Authoritative)'}
    TC (Truncated):             ${flags.tc} ${flags.tc ? '(Truncated - Use TCP)' : '(Not Truncated)'}
    RD (Recursion Desired):     ${flags.rd} ${flags.rd ? '(Recursion Requested)' : '(No Recursion)'}
    RA (Recursion Available):   ${flags.ra} ${flags.ra ? '(Recursion Available)' : '(No Recursion)'}
    Z (Reserved):               ${flags.z} (Must be 0)
    RCODE (Response Code):      ${flags.rcode} ${flags.rcode === 0 ? '(No Error)' : '(Error)'}

  Question Count:    ${packet.questions?.length || 0}
  Answer Count:      ${packet.answers?.length || 0}
  Authority Count:   ${packet.authorities?.length || 0}
  Additional Count:  ${packet.additionals?.length || 0}

Question Section:
${packet.questions?.map(q => `  Name: ${q.name}\n  Type: ${q.type} (${getRecordTypeName(q.type)})\n  Class: ${q.class} (IN)`).join('\n') || '  None'}

Answer Section:
${packet.answers?.map(a => `  Name: ${a.name}\n  Type: ${a.type}\n  Class: ${a.class}\n  TTL: ${a.ttl}s\n  Data: ${JSON.stringify(a.data)}`).join('\n\n') || '  None'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  };

  const getRecordTypeName = (type) => {
    
    if (typeof type === 'string') {
        return type; 
    }
    const types = { 1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 2: 'NS', 16: 'TXT', 6: 'SOA' };
    return types[type] || 'Unknown';
  };

  const copyToClipboard = (text, format) => {
    navigator.clipboard.writeText(text).then(() => {
      if (copyNotificationRef.current) {
        copyNotificationRef.current.textContent = `✅ ${format} format copied!`;
        copyNotificationRef.current.style.opacity = '1';
        setTimeout(() => {
          if (copyNotificationRef.current) {
            copyNotificationRef.current.style.opacity = '0';
          }
        }, 2000);
      }
    });
  };

  
  const downloadJSON = () => {
    if (!results.liveData?.structuredExport) return;
    
    const dataStr = JSON.stringify(results.liveData.structuredExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trace_${results.domain}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  
  const downloadRawOutput = () => {
    if (!results.liveData?.rawOutput) return;
    
    const dataBlob = new Blob([results.liveData.rawOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dig_trace_${results.domain}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  
  const getResultBadge = (result) => {
    const badges = {
      success: { icon: '✅', label: 'Success', className: 'success' },
      network_unreachable: { icon: '❌', label: 'Unreachable', className: 'error' },
      timeout: { icon: '⏱️', label: 'Timeout', className: 'warning' },
      refused: { icon: '🚫', label: 'Refused', className: 'error' },
      formerr: { icon: '⚠️', label: 'Format Error', className: 'warning' },
      servfail: { icon: '❌', label: 'Server Fail', className: 'error' },
      other: { icon: '❓', label: 'Other', className: 'warning' }
    };
    return badges[result] || badges.other;
  };

  
  const getFamilyBadge = (family) => {
    return family === 'ipv6' 
      ? { label: 'IPv6', className: 'ipv6-badge' }
      : { label: 'IPv4', className: 'ipv4-badge' };
  };

  
  const getStageIcon = (stage, messageType) => {
    const isQuery = messageType === 'QUERY';
    const isResponse = messageType === 'RESPONSE';
    
    const icons = {
      browser_cache: '🌐',
      os_cache: '💻',
      recursive_query: '🔵', 
      recursive_answer: '🟢',
      root_query: '🔵', 
      tld_referral: '🟢', 
      tld_query: '🔵', 
      authoritative_referral: '🟢', 
      authoritative_query: '🔵', 
      authoritative_server: '🟢',
      final_answer: '✅',
      nxdomain: '❌',  
      cname_referral: '➡️', 
      glue_resolve_start: 'ℹ️', 
      glue_resolve_success: '✅', 
      error: '❌', 
      
      recursive_resolver: '🔄',
      recursive_to_root_query: '🔵',
      root_to_recursive_response: '🟢',
      recursive_to_tld_query: '🔵',
      tld_to_recursive_response: '🟢',
      recursive_to_auth_query: '🔵',
      auth_to_recursive_response: '🟢',
      recursive_to_client_response: '🟢',
      client_to_root_query: '🔵',
      root_to_client_response: '🟢',
      client_to_tld_query: '🔵',
      tld_to_client_response: '🟢',
      client_to_auth_query: '🔵',
      auth_to_client_response: '🟢',
      dnssec_validation: '🔒',
      packet_loss: '⚠️',
      packet_retry_success: '🔄',
      packet_loss_fatal: '❌'
    };
    
    if (icons[stage]) {
      return icons[stage];
    } else if (isQuery) {
      return '🔵';
    } else if (isResponse) {
      return '🟢';
    }
    return '📡';
  };

  const getMessageTypeLabel = (step) => {
    if (step.messageType === 'QUERY') {
      return { label: 'DNS Query', color: '#3b82f6', icon: '🔵' };
    } else if (step.messageType === 'RESPONSE') {
      return { label: 'DNS Response', color: '#10b981', icon: '🟢' };
    }
    return { label: 'DNS Message', color: '#6b7280', icon: '📡' };
  };

  const getRootServerInfo = (step) => {
    
    const rootServers = [
      { letter: 'A', operator: 'Verisign', location: 'Dulles, VA, USA', ip: '198.41.0.4' },
      
    ];
    const hash = (step.query?.domain || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedRoot = rootServers[hash % rootServers.length];
    
    if (step.stage.includes('root') || step.server?.type === 'Root') { 
      return selectedRoot;
    }
    return null;
  };

  const getTimingExplanation = (step) => {
    
    if (!step.timing && !step.latency) return null;
    const explanations = [];
    
    return explanations;
  };

  
  const getWhatThisMeans = (step) => {
    
    if (step.isDelegation && step.delegationInfo) {
      return `This is a subdomain delegation. ${step.delegationInfo.explanation} This is a common practice for organizations that want to manage their DNS independently. Instead of following the traditional hierarchy (root → TLD → intermediate zones → final domain), the parent zone directly delegates authority to the subdomain's nameservers. ${step.delegationInfo.skippedLevels && step.delegationInfo.skippedLevels.length > 0 ? `The ${step.delegationInfo.skippedLevels.map(l => '.' + l).join(', ')} zone(s) were skipped in this process.` : ''}`;
    }
    
    const explanations = {
      browser_cache: "Your web browser keeps a temporary copy of DNS records it has looked up recently. This is the fastest way to resolve a domain name because it doesn't require any network communication.",
      os_cache: "Your operating system also maintains its own DNS cache. If the browser doesn't have the record, it checks here next. This cache is shared by all applications on your computer.",
      recursive_query: "This is your ISP's or a public DNS server (like Google's 8.8.8.8) that does the hard work of finding the answer for you. It queries multiple servers on your behalf.",
      recursive_answer: "The recursive resolver has finished its work and is returning the final answer (or an error) to your client.",
      root_query: "This is the first step in an iterative query. The client is asking a Root Server (one of 13 globally distributed clusters) where to find the servers for the Top-Level Domain (e.g., '.com').",
      tld_referral: "The Root Server responded with a 'referral,' pointing the client to the TLD (Top-Level Domain) servers that manage the '.com' zone.",
      tld_query: "The client is now asking the TLD Server (e.g., 'a.gtld-servers.net') where to find the *authoritative* nameservers for the specific domain (e.g., 'google.com').",
      authoritative_referral: "The TLD Server responded with a 'referral,' pointing the client to the final Authoritative Nameservers (e.g., 'ns1.google.com') that hold the actual records.",
      delegation_query: "This is querying a delegated subdomain. The parent zone has directly delegated authority to this subdomain's nameservers, bypassing intermediate DNS hierarchy levels.",
      delegation_response: "The parent zone is responding with NS records that directly point to the subdomain's authoritative nameservers. This is a subdomain delegation.",
      authoritative_query: "This is the final query. The client is asking the Authoritative Nameserver (e.g., 'ns1.google.com') for the specific 'A' record (the IP address) for 'google.com'.",
      authoritative_server: "This server has the definitive answer for the domain. It's managed by the domain owner or their hosting provider and contains the actual DNS records.",
      cname_referral: "The server returned a 'Canonical Name' (CNAME) record. This means the queried domain is just an alias for another domain, and the entire DNS lookup process must be restarted for the new domain name.",
      glue_resolve_start: "A 'glue record' lookup is needed. The previous server referred us to a nameserver (e.g., 'ns1.example.com') but didn't provide its IP address. We must now perform a *new*, separate DNS query (starting from the root) just to find the IP of 'ns1.example.com'.",
      glue_resolve_success: "The separate 'glue record' query was successful. We now have the IP address for the nameserver we were referred to, and the original query can resume.",
      error: "This step failed. See the error message for details. This could be a network timeout, a server error, or a critical failure like a failed glue record lookup.",
      root_server: "Root servers are the top of the DNS hierarchy. They don't know the answer but can tell you which TLD server to ask next (like the .com or .org servers).",
      tld_server: "Top-Level Domain servers manage specific extensions like .com, .org, .net. They refer you to the authoritative nameserver for the specific domain.",
      dnssec_validation: "DNSSEC adds digital signatures to DNS records to verify they haven't been tampered with. This protects against DNS spoofing attacks."
    };

    for (const [key, explanation] of Object.entries(explanations)) {
      if (step.stage.includes(key)) return explanation;
    }
    return "This step is part of the DNS resolution process that helps translate domain names into IP addresses.";
  };

  
  const getImpactAnalysis = (step) => {
    const impacts = [];

    if (step.error) {
       impacts.push({
          icon: '❌',
          type: 'Critical Error',
          text: `This step failed: ${step.error}. This failure may halt the entire resolution process.`
       });
    }
    
    
    if (step.isDelegation && step.delegationInfo) {
      impacts.push({
        icon: '🚀',
        type: 'Performance Benefit',
        text: step.delegationInfo.benefit || 'Subdomain delegation allows faster DNS resolution by reducing the number of queries needed.'
      });
      impacts.push({
        icon: '🔧',
        type: 'DNS Architecture',
        text: 'This delegation gives the subdomain owner full control over their DNS records without requiring changes to parent zones.'
      });
      if (step.delegationInfo.skippedLevels && step.delegationInfo.skippedLevels.length > 0) {
        impacts.push({
          icon: '⏭️',
          type: 'Hierarchy Bypass',
          text: `${step.delegationInfo.skippedLevels.length} DNS level(s) were skipped: ${step.delegationInfo.skippedLevels.map(l => '.' + l).join(', ')}. This is normal for subdomain delegations.`
        });
      }
    }
    
    if (step.stage === 'glue_resolve_start') {
        impacts.push({
          icon: '⚠️',
          type: 'Performance',
          text: 'A glue record lookup adds significant latency, as it requires one or more *additional* DNS queries (a full new resolution) just to find the next server.'
        });
    }
    
    
    if (step.hasDNSSEC || (step.response && step.response.dnssec)) {
      impacts.push({
        icon: '🔒',
        type: 'Security',
        text: 'DNSSEC signatures are present, providing cryptographic verification that these DNS records are authentic and have not been tampered with.'
      });
    }
    
    
    if (step.response && step.response.nameservers && step.response.nameservers.length > 0) {
      const nsCount = step.response.nameservers.length;
      if (nsCount >= 4) {
        impacts.push({
          icon: '✅',
          type: 'Redundancy',
          text: `${nsCount} nameservers provide high availability. If one fails, others can respond.`
        });
      } else if (nsCount < 2) {
        impacts.push({
          icon: '⚠️',
          type: 'Reliability Risk',
          text: `Only ${nsCount} nameserver(s) configured. Best practice is to have at least 2-4 for redundancy.`
        });
      }
    }
    
    
    if (step.timing) {
      if (step.timing < 50) {
        impacts.push({
          icon: '⚡',
          type: 'Performance',
          text: `Excellent response time (${step.timing}ms). Server is geographically close or well-optimized.`
        });
      } else if (step.timing > 200) {
        impacts.push({
          icon: '🐌',
          type: 'Performance',
          text: `Slow response time (${step.timing}ms). Server may be far away or experiencing high load.`
        });
      }
    }
    
    if (step.response?.found && step.response.records && step.response.records.length > 0) {
      const recordCount = step.response.records.length;
      const recordTypes = [...new Set(step.response.records.map(r => r.type))].join(', ');
      impacts.push({
        icon: '✅',
        type: 'Info',
        text: `Successfully resolved ${recordCount} ${recordCount === 1 ? 'record' : 'records'} (${recordTypes}). DNS resolution complete!`
      });
    }

    if (impacts.length === 0) {
       return [
        { icon: '✅', type: 'Info', text: 'This step completed successfully with no notable issues' }
       ];
    }
    return impacts;
  };

  const renderTimeline = () => {
    
    if (!results.steps || !Array.isArray(results.steps)) {
      return (
        <div className="timeline-error">
          <p>⚠️ No resolution steps available. The DNS query may have failed or returned an unexpected response.</p>
        </div>
      );
    }

    if (results.steps.length === 0) {
      return (
        <div className="timeline-error">
          <p>⚠️ No resolution steps were recorded. This might indicate a configuration issue.</p>
        </div>
      );
    }

    return (
      <div className="timeline">
        {results.steps.map((step, index) => {
        const messageInfo = getMessageTypeLabel(step);
        const rootServer = getRootServerInfo(step);
        const timingDetails = getTimingExplanation(step);
        
        
        const itemClasses = [
          'timeline-item',
          expandedStep === index ? 'expanded' : '',
          step.messageType?.toLowerCase() || '',
          step.error ? 'error' : ''
        ].join(' ');

        return (
          <div key={index} className={itemClasses}>
          <div className="timeline-marker">
            <span className={`step-icon ${step.messageType?.toLowerCase() || ''} ${step.error ? 'error' : ''}`}>
              {getStageIcon(step.stage, step.messageType)}
            </span>
            <div className="timeline-line"></div>
          </div>
          <div className="timeline-content">
            <div className="timeline-header" onClick={() => toggleStep(index)}>
              <div className="timeline-title">
                <div className="title-row">
                  <h4>{step.name}</h4>
                  {step.server?.type && (
                    <span className={`step-type-badge ${step.server.type}`}>
                      {step.server.type.toUpperCase()}
                    </span>
                  )}
                  <span 
                    className={`message-type-badge ${step.messageType?.toLowerCase() || ''}`}
                    style={{ backgroundColor: `${messageInfo.color}20`, color: messageInfo.color, border: `1px solid ${messageInfo.color}` }}
                  >
                    {messageInfo.icon} {messageInfo.label}
                  </span>
                </div>
                <div className="badges">
                  {step.error && (
                    <span className="error-badge" title={step.error}>
                      ❌ FAILED
                    </span>
                  )}
                  <span className="timing-badge">⏱️ {step.timing}ms</span>
                  {step.latency && (
                    <span className="latency-badge" title="Network round-trip time">
                      🌐 RTT: {step.latency}ms
                    </span>
                  )}
                  {}
                  {results.liveData?.structuredExport?.steps?.[index]?.attempts && 
                   results.liveData.structuredExport.steps[index].attempts.some(a => a.result !== 'success') && (
                    <span className="transport-warning-badge" title="Some DNS query attempts failed or timed out - see Transport Attempts section for details">
                      ⚠️ RETRIES
                    </span>
                  )}
                  {step.response?.cached && (
                    <span className="cache-badge" title="Response from cache">
                      💾 CACHED
                    </span>
                  )}
                  {step.response?.referral && (
                    <span className="referral-badge" title="Referral to next server">
                      ➡️ REFERRAL
                    </span>
                  )}
                </div>
              </div>
              <span className="expand-icon">{expandedStep === index ? '▼' : '▶'}</span>
            </div>
            
            {expandedStep === index && (
              <div className="timeline-details">
                {step.error && (
                  <div className="detail-section error-section">
                    <h5>❌ Step Failed</h5>
                    <p className="error-message">{step.error}</p>
                  </div>
                )}
                
                {step.explanation && (
                  <div className="explanation-section main-explanation">
                    <h5>💡 Explanation</h5>
                    {step.explanation.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}

                {}
                {}
                
                {step.server && (
                  <div className="detail-section">
                    <h5>🖥️ Server Information</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Name:</span>
                        <span className="value">{step.server.name || step.server}</span>
                      </div>
                      {step.server.ip && (
                        <div className="info-item">
                          <span className="label">IP Address:</span>
                          <span className="value">{step.server.ip}</span>
                        </div>
                      )}
                      {step.server.type && (
                        <div className="info-item">
                          <span className="label">Server Type:</span>
                          <span className="value" style={{textTransform: 'capitalize'}}>{step.server.type}</span>
                        </div>
                      )}
                      {step.server.zone && (
                        <div className="info-item">
                          <span className="label">DNS Zone:</span>
                          <span className="value">{step.server.zone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {}
                {step.isDelegation && step.delegationInfo && (
                  <div className="detail-section delegation-section" style={{
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    marginTop: '15px'
                  }}>
                    <h5 style={{color: '#e65100', marginBottom: '10px'}}>
                      🔗 Subdomain Delegation Detected
                    </h5>
                    <div className="delegation-details">
                      <p style={{marginBottom: '10px'}}>
                        <strong>What happened:</strong> {step.delegationInfo.explanation}
                      </p>
                      <p style={{marginBottom: '10px'}}>
                        <strong>Impact:</strong> {step.delegationInfo.impact}
                      </p>
                      <p>
                        <strong>Benefit:</strong> {step.delegationInfo.benefit}
                      </p>
                      {step.delegationInfo.skippedLevels && step.delegationInfo.skippedLevels.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '4px',
                          borderLeft: '4px solid #f57c00'
                        }}>
                          <strong>⚠️ Skipped DNS Levels:</strong>
                          <ul style={{marginTop: '8px', marginLeft: '20px'}}>
                            {step.delegationInfo.skippedLevels.map((level, idx) => (
                              <li key={idx} style={{marginBottom: '4px'}}>
                                <code style={{
                                  background: 'rgba(0,0,0,0.05)',
                                  padding: '2px 6px',
                                  borderRadius: '3px'
                                }}>
                                  .{level}
                                </code>
                                {' '}zone was bypassed
                              </li>
                            ))}
                          </ul>
                          <p style={{marginTop: '8px', fontSize: '0.9em', color: '#666'}}>
                            💡 <em>These intermediate zones were not queried because the parent zone 
                            directly delegates authority to the subdomain.</em>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {}
                {step.response && (
                  <div className="detail-section response-details-section">
                    <h5>📬 Response Details</h5>
                    <div className="info-grid">
                      {step.response.nameservers && step.response.nameservers.length > 0 && (
                        <div className="info-item" style={{gridColumn: '1 / -1'}}>
                          <span className="label">Referred Nameservers:</span>
                          <span className="value">{step.response.nameservers.length} servers</span>
                        </div>
                      )}
                      {step.response.ttl && (
                        <div className="info-item">
                          <span className="label">TTL (Cache Time):</span>
                          <span className="value">{step.response.ttl} seconds ({Math.floor(step.response.ttl / 3600)}h {Math.floor((step.response.ttl % 3600) / 60)}m)</span>
                        </div>
                      )}
                      {step.receivedBytes && (
                        <div className="info-item">
                          <span className="label">Response Size:</span>
                          <span className="value">{step.receivedBytes} bytes</span>
                        </div>
                      )}
                      {typeof step.response.dnssec !== 'undefined' && (
                        <div className="info-item">
                          <span className="label">
                            DNSSEC:
                            <span 
                              className="info-tooltip" 
                              title="This indicates if THIS response has a valid RRSIG signature. Parent zones can contain DS records for child zones even when the parent's response itself is unsigned. This is normal DNSSEC behavior due to the hierarchical trust model."
                            >
                              ℹ️
                            </span>
                          </span>
                          <span className="value" style={{
                            color: step.response.dnssec ? '#2e7d32' : '#666',
                            fontWeight: 'bold'
                          }}>
                            {step.response.dnssec ? '✅ Signed' : '❌ Not Signed'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {}
                    {step.response.status === 'NXDOMAIN' && step.response.soa && (
                      <div className="nxdomain-section">
                        <div className="nxdomain-header">
                          <h5>❌ Domain Not Found (NXDOMAIN)</h5>
                        </div>
                        <div className="nxdomain-explanation">
                          <p>
                            <strong>ℹ️ What this means:</strong> The domain <code>{results.domain}</code> does not exist 
                            in the <strong>{step.response.soa.zone}</strong> zone. The nameserver returned an SOA (Start of Authority) 
                            record to prove this domain is not registered.
                          </p>
                        </div>
                        <div className="soa-record">
                          <h6>📋 SOA Record (Proof of Non-Existence)</h6>
                          <div className="soa-details">
                            <div className="soa-item">
                              <span className="label">Zone:</span>
                              <span className="value">{step.response.soa.zone}</span>
                            </div>
                            <div className="soa-item">
                              <span className="label">TTL:</span>
                              <span className="value">{step.response.soa.ttl} seconds</span>
                            </div>
                            <div className="soa-item" style={{gridColumn: '1 / -1'}}>
                              <span className="label">Data:</span>
                              <code className="soa-data">{step.response.soa.data}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {}
                    {step.response.nameservers && step.response.nameservers.length > 0 && (
                      <div className="nameservers-list" style={{marginTop: '15px'}}>
                        <h6 style={{marginBottom: '8px', color: '#555'}}>
                          👉 Referred to these nameservers:
                        </h6>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: '8px',
                          padding: '10px',
                          background: '#f0f7ff',
                          borderRadius: '6px'
                        }}>
                          {step.response.nameservers.map((ns, idx) => (
                            <div key={idx} style={{
                              padding: '8px 12px',
                              background: 'white',
                              borderRadius: '4px',
                              fontSize: '0.9em',
                              border: '1px solid #2196f3',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{color: '#2196f3'}}>🖥️</span>
                              {ns}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {}
                {results.liveData?.structuredExport?.steps?.[index]?.attempts && 
                 results.liveData.structuredExport.steps[index].attempts.length > 0 && (
                  <div className="detail-section attempts-section">
                    <div className="attempts-header">
                      <h5>🔄 Transport Attempts</h5>
                      <span className="attempts-count-badge">
                        {results.liveData.structuredExport.steps[index].attempts.length} attempts
                      </span>
                    </div>
                    <div className="attempts-grid">
                      {results.liveData.structuredExport.steps[index].attempts.map((attempt, attemptIdx) => {
                        const badge = getResultBadge(attempt.result);
                        const familyBadge = getFamilyBadge(attempt.family);
                        const isSuccess = attempt.result === 'success';
                        const isFallback = attemptIdx > 0 && attempt.result === 'success' && 
                                          results.liveData.structuredExport.steps[index].attempts[attemptIdx - 1].result !== 'success';
                        
                        return (
                          <div key={attemptIdx} className={`attempt-card ${attempt.result} ${isSuccess ? 'success' : 'failed'}`}>
                            <div className="attempt-header-row">
                              <span className="attempt-number">#{attemptIdx + 1}</span>
                              <span className={`family-badge ${attempt.family}`}>
                                {familyBadge.label}
                              </span>
                              <span className={`result-badge ${attempt.result}`}>
                                {badge.icon} {badge.label}
                              </span>
                              {attempt.time_ms !== undefined && (
                                <span className="attempt-time">{attempt.time_ms}ms</span>
                              )}
                            </div>
                            <div className="attempt-details">
                              <div className="attempt-target">
                                <span className="label">Target:</span>
                                <code className="target-ip">{attempt.target_ip}:{attempt.port || 53}</code>
                              </div>
                              <div className="attempt-protocol">
                                <span className="label">Protocol:</span>
                                <span className="value">{attempt.protocol?.toUpperCase() || 'UDP'}</span>
                              </div>
                            </div>
                            {attempt.diagnostic && (
                              <div className="attempt-diagnostic">
                                <span className="diagnostic-icon">⚠️</span>
                                <span className="diagnostic-text">{attempt.diagnostic}</span>
                              </div>
                            )}
                            {isFallback && (
                              <div className="fallback-indicator">
                                <span className="fallback-icon">🔄</span>
                                <span className="fallback-text">Fallback from previous failure</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {}
                    {(() => {
                      const attempts = results.liveData.structuredExport.steps[index].attempts;
                      const hasIPv6Failure = attempts.some(a => a.family === 'ipv6' && a.result !== 'success');
                      const hasIPv4Success = attempts.some(a => a.family === 'ipv4' && a.result === 'success');
                      
                      if (hasIPv6Failure && hasIPv4Success) {
                        return (
                          <div className="fallback-summary">
                            <div className="fallback-icon-large">🔄</div>
                            <div className="fallback-content">
                              <strong>IPv6 → IPv4 Fallback Detected</strong>
                              <p>
                                The resolver attempted IPv6 first but encountered {
                                  attempts.filter(a => a.family === 'ipv6' && a.result !== 'success')[0]?.result || 'errors'
                                }. 
                                It successfully fell back to IPv4, which is the standard dual-stack behavior.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {}
                {results.liveData?.structuredExport?.steps?.[index]?.dnssec && 
                 results.liveData.structuredExport.steps[index].dnssec.length > 0 && (
                  <div className="detail-section dnssec-section">
                    <div className="dnssec-header">
                      <h5>🔒 DNSSEC Records</h5>
                      <span className="dnssec-count-badge">
                        {results.liveData.structuredExport.steps[index].dnssec.length} records
                      </span>
                    </div>
                    <div className="dnssec-explanation">
                      <p>
                        <strong>ℹ️ Why DNSSEC records appear with "Not Signed":</strong> These delegation records 
                        (DS, DNSKEY, RRSIG) establish the <em>chain of trust</em> to child zones. Parent zones provide 
                        DS records to verify child zone keys, even if the parent's own response is unsigned. This is 
                        correct DNSSEC behavior.
                      </p>
                    </div>
                    <div className="dnssec-records">
                      {results.liveData.structuredExport.steps[index].dnssec.map((record, dnssecIdx) => (
                        <div key={dnssecIdx} className={`dnssec-record ${record.type.toLowerCase()}`}>
                          <div className="dnssec-record-header">
                            <span className="dnssec-type-badge">{record.type}</span>
                            <button
                              className="dnssec-expand-btn"
                              onClick={() => {
                                const key = `${index}-${dnssecIdx}`;
                                setExpandedDNSSEC(prev => ({
                                  ...prev,
                                  [key]: !prev[key]
                                }));
                              }}
                            >
                              {expandedDNSSEC[`${index}-${dnssecIdx}`] ? '▼ Hide' : '▶ Show'} Data
                            </button>
                          </div>
                          {expandedDNSSEC[`${index}-${dnssecIdx}`] && (
                            <div className="dnssec-record-data">
                              <pre>{record.data}</pre>
                              <div className="dnssec-explanation">
                                <strong>What this means:</strong>
                                <p>{getDNSSECExplanation(record.type)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Answer Block (for final answer steps only) */}
                {(step.isFinalAnswer || step.stage === 'final_answer') && step.response && (
                  <div className="detail-section final-answer-summary">
                    <h4>✅ Final Answer Received</h4>
                    <div className="final-answer-details">
                      <div className="answer-main">
                        <div className="answer-item">
                          <span className="answer-label">Query:</span>
                          <span className="answer-value domain-name">{results.domain}</span>
                        </div>
                        <div className="answer-item">
                          <span className="answer-label">Record Type:</span>
                          <span className="answer-value record-type">{step.response.record || results.recordType}</span>
                        </div>
                        <div className="answer-item">
                          <span className="answer-label">Answer:</span>
                          <span className="answer-value ip-address">{step.response.answer}</span>
                        </div>
                        {step.server && (
                          <div className="answer-item">
                            <span className="answer-label">Authoritative Server:</span>
                            <span className="answer-value server-name">
                              {step.server.name}
                              {step.server.ip && ` (${step.server.ip})`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="answer-explanation">
                        <p>
                          <strong>What this means:</strong> The domain <code>{results.domain}</code> resolves to the IP address{' '}
                          <code className="highlight-ip">{step.response.answer}</code>. This information was provided by the{' '}
                          authoritative nameserver <strong>{step.server?.name || 'for this domain'}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ... (rest of the packet/flag/collapsible sections) ... */}
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
    );
  };

  const renderSummary = () => {
    // Guard clause: Ensure results has the required properties
    if (!results) {
      return (
        <div className="summary-error">
          <p>⚠️ No results data available.</p>
        </div>
      );
    }

    return (
      <div className="summary-panel">
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Domain</h4>
          <p className="summary-value">{results.domain}</p>
        </div>
        <div className="summary-card">
          <h4>Record Type</h4>
          <p className="summary-value">{results.recordType || 'N/A'}</p>
        </div>
        <div className="summary-card">
          <h4>Resolution Mode</h4>
          <p className="summary-value">{results.mode || 'N/A'}</p>
        </div>
        <div className="summary-card">
          <h4>Total Time</h4>
          <p className="summary-value">{results.totalTime !== undefined ? `${results.totalTime}ms` : 'N/A'}</p>
        </div>
        <div className="summary-card">
          <h4>Total Steps</h4>
          <p className="summary-value">{results.steps?.length || 0}</p>
        </div>
        <div className="summary-card">
          <h4>Status</h4>
          <p className={`summary-value ${results.success ? 'success' : 'error'}`}>
            {results.success ? '✅ Success' : '❌ Failed'}
          </p>
        </div>
      </div>

      {/* Final Answer Section */}
      {results.steps && results.steps.length > 0 && (() => {
        // Check for NXDOMAIN first
        const nxdomainStep = results.steps.find(step => step.response?.status === 'NXDOMAIN');
        if (nxdomainStep && nxdomainStep.response?.soa) {
          return (
            <div className="final-answer-summary nxdomain">
              <h4>❌ Domain Not Found (NXDOMAIN)</h4>
              <div className="final-answer-details">
                <div className="answer-main">
                  <div className="answer-item">
                    <span className="answer-label">Query:</span>
                    <span className="answer-value domain-name">{results.domain}</span>
                  </div>
                  <div className="answer-item">
                    <span className="answer-label">Record Type:</span>
                    <span className="answer-value record-type">{results.recordType}</span>
                  </div>
                  <div className="answer-item">
                    <span className="answer-label">Status:</span>
                    <span className="answer-value nxdomain-status">❌ NXDOMAIN</span>
                  </div>
                  <div className="answer-item">
                    <span className="answer-label">Failed at:</span>
                    <span className="answer-value server-name">{nxdomainStep.response.soa.zone}</span>
                  </div>
                </div>
                <div className="answer-explanation nxdomain-explanation">
                  <p>
                    <strong>What this means:</strong> The domain <code>{results.domain}</code> does not exist.{' '}
                    The nameserver for <strong>{nxdomainStep.response.soa.zone}</strong> returned an SOA record{' '}
                    indicating this domain is not registered in its zone.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        
        // Otherwise, check for successful final answer
        const finalStep = results.steps.find(step => step.isFinalAnswer || step.stage === 'final_answer');
        if (finalStep && finalStep.response) {
          return (
            <div className="final-answer-summary">
              <h4>✅ Final Answer Received</h4>
              <div className="final-answer-details">
                <div className="answer-main">
                  <div className="answer-item">
                    <span className="answer-label">Query:</span>
                    <span className="answer-value domain-name">{results.domain}</span>
                  </div>
                  <div className="answer-item">
                    <span className="answer-label">Record Type:</span>
                    <span className="answer-value record-type">{finalStep.response.record || results.recordType}</span>
                  </div>
                  <div className="answer-item">
                    <span className="answer-label">Answer:</span>
                    <span className="answer-value ip-address">{finalStep.response.answer}</span>
                  </div>
                  {finalStep.server && (
                    <div className="answer-item">
                      <span className="answer-label">Authoritative Server:</span>
                      <span className="answer-value server-name">
                        {finalStep.server.name}
                        {finalStep.server.ip && ` (${finalStep.server.ip})`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="answer-explanation">
                  <p>
                    <strong>What this means:</strong> The domain <code>{results.domain}</code> resolves to the IP address{' '}
                    <code className="highlight-ip">{finalStep.response.answer}</code>. This information was provided by the{' '}
                    authoritative nameserver <strong>{finalStep.server?.name || 'for this domain'}</strong>.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
    );
  };

  const renderRawOutput = () => {
    if (!results.liveData?.rawOutput) {
      return (
        <div className="live-data-container">
          <p className="no-data">No raw output available</p>
        </div>
      );
    }

    return (
      <div className="live-data-container">
        <div className="raw-output-header">
          <h3>🔍 Raw dig +trace Output</h3>
          <div className="action-buttons">
            <button
              className="copy-button"
              onClick={() => copyToClipboard(results.liveData.rawOutput)}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
            <button
              className="download-button"
              onClick={downloadRawOutput}
              title="Download as text file"
            >
              💾 Download
            </button>
          </div>
        </div>
        <pre className="raw-output-content">
          {results.liveData.rawOutput}
        </pre>
      </div>
    );
  };

  const renderJSONExport = () => {
    if (!results.liveData?.structuredExport) {
      return (
        <div className="live-data-container">
          <p className="no-data">No structured export available</p>
        </div>
      );
    }

    const exportData = results.liveData.structuredExport;
    const jsonString = JSON.stringify(exportData, null, 2);

    return (
      <div className="live-data-container">
        <div className="json-export-header">
          <h3>📦 Structured JSON Export</h3>
          <div className="action-buttons">
            <button
              className="copy-button"
              onClick={() => copyToClipboard(jsonString)}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
            <button
              className="download-button"
              onClick={downloadJSON}
              title="Download as JSON file"
            >
              💾 Download
            </button>
          </div>
        </div>

        <div className="json-export-info">
          <p>
            <strong>Query:</strong> {exportData.query?.name} ({exportData.query?.qtype})
          </p>
          <p>
            <strong>Duration:</strong> {exportData.duration_ms}ms
          </p>
          <p>
            <strong>Steps:</strong> {exportData.steps?.length || 0} resolution stages
          </p>
          <p>
            <strong>Total Attempts:</strong>{' '}
            {exportData.steps?.reduce((sum, step) => sum + (step.attempts?.length || 0), 0) || 0}
          </p>
        </div>

        <pre className="json-export-content">
          {jsonString}
        </pre>
      </div>
    );
  };

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>📋 Resolution Details</h2>
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </button>
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          {results.liveData && (
            <>
              <button
                className={`tab-button ${activeTab === 'rawoutput' ? 'active' : ''}`}
                onClick={() => setActiveTab('rawoutput')}
              >
                📄 Raw Output
              </button>
              <button
                className={`tab-button ${activeTab === 'jsonexport' ? 'active' : ''}`}
                onClick={() => setActiveTab('jsonexport')}
              >
                📦 JSON Export
              </button>
            </>
          )}
        </div>
      </div>

      <div className="results-content">
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'rawoutput' && renderRawOutput()}
        {activeTab === 'jsonexport' && renderJSONExport()}
      </div>

      <div ref={copyNotificationRef} className="copy-notification">
        Copied!
      </div>
    </div>
  );
}

export default ResultsPanel;