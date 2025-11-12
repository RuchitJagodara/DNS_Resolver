import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import '../styles/VisualizationPanel.css';
import DynamicVisualization from './DynamicVisualization';


export const useIsLiveMode = (results) => {
  return useMemo(() => {
    if (!results) return false;
    const modeHints = [
      results.mode,
      results.Mode,
      results.configuration?.mode,
      results.settings?.mode,
    ];
    const liveFlags = [
      results.isLive,
      results.liveMode,
      results.configuration?.isLive,
      results.configuration?.liveMode,
      results.settings?.isLive,
      results.settings?.liveMode,
    ];
    if (liveFlags.some(flag => flag === true || flag === 'true')) return true;
    return modeHints
      .filter(Boolean)
      .map(value => value.toString().toLowerCase())
      .some(value => value.includes('live'));
  }, [results]);
};

function VisualizationPanel({ results }) {
  const svgRef = useRef();
  const containerRef = useRef();
  const tooltipRef = useRef();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState('network'); 
  const [showLegend, setShowLegend] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomTransform, setZoomTransform] = useState(null);
  const isLiveMode = useIsLiveMode(results);
  const totalSteps = results?.steps?.length || 0;
  const displayStepIndex = isLiveMode ? Math.max(totalSteps - 1, 0) : currentStep;

  useEffect(() => {
    if (results && results.steps) {
      setCurrentStep(0);
      setIsPlaying(false);
      setSelectedNode(null);
      drawVisualization();
    }
  }, [results]);

  useEffect(() => {
    if (!results?.steps || isLiveMode) return;

    if (isPlaying && currentStep < results.steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentStep >= results.steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, results, isLiveMode]);

  useEffect(() => {
    if (isLiveMode) {
      setIsPlaying(false);
    }
  }, [isLiveMode]);

  useEffect(() => {
    if (results && results.steps) {
      drawVisualization();
    }
  }, [currentStep, viewMode, isLiveMode]);

  
  useEffect(() => {
    if (!results?.steps || isLiveMode) return;
    const handleKeyPress = (e) => {
      if (!results || !results.steps) return;

      switch(e.key) {
        case 'ArrowRight':
          if (currentStep < results.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
          }
          break;
        case 'ArrowLeft':
          if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
          }
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Home':
          setCurrentStep(0);
          break;
        case 'End':
          setCurrentStep(results.steps.length - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, results, isLiveMode]);

  
  const getScenarioColor = (step) => {
    if (step.response?.found === false && step.response?.referral) {
      return { primary: '#f97316', secondary: '#ea580c' }; 
    }
    if (step.stage.includes('dnssec')) {
      return { primary: '#fbbf24', secondary: '#f59e0b' }; 
    }
    if (step.response?.found === true) {
      return { primary: '#10b981', secondary: '#059669' }; 
    }
    if (step.response?.cached) {
      return { primary: '#3b82f6', secondary: '#2563eb' }; 
    }
    return { primary: '#8b5cf6', secondary: '#7c3aed' }; 
  };

  const showTooltip = useCallback((event, content) => {
    if (!tooltipRef.current) return;
    const tooltip = d3.select(tooltipRef.current);
    tooltip
      .style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(content);
  }, []);

  const hideTooltip = useCallback(() => {
    if (!tooltipRef.current) return;
    d3.select(tooltipRef.current).style('opacity', 0);
  }, []);

  
  const getDetailedExplanation = useCallback((step, allSteps, stepIndex, config) => {
    const isRecursiveMode = config?.mode === 'recursive' || !config?.mode;
    const isIterativeMode = config?.mode === 'iterative';
    const domain = config?.domain || 'example.com';

    
    const explanation = {
      overview: '',
      technical: '',
      whatHappened: '',
      whyItMatters: '',
      possibleIssues: [],
      nextSteps: '',
      performanceNotes: ''
    };

    
    switch (step.stage) {
      case 'browser_cache':
      case 'browser':
        if (step.response?.found) {
          explanation.overview = `✅ Cache Hit: Domain resolution found in browser cache`;
          explanation.whatHappened = `The browser checked its internal DNS cache and found a cached record for "${domain}". This is the fastest possible DNS resolution because no network requests were needed.`;
          explanation.technical = `The browser maintains a DNS cache (typically in memory) that stores recently resolved domain names and their IP addresses. Each cached entry has a Time-To-Live (TTL) value that determines how long it remains valid. In this case, the cached entry for "${domain}" was still within its TTL period (${step.response.ttl || 'N/A'} seconds remaining).`;
          explanation.whyItMatters = `Browser cache hits are extremely fast (typically < 1ms) because they eliminate all network overhead. This significantly improves page load times for frequently visited websites.`;
          explanation.performanceNotes = `⚡ Performance: Excellent (${step.timing}ms). No network requests required.`;
          explanation.nextSteps = `The cached IP address is immediately returned to the application. No further DNS queries are necessary.`;
        } else {
          explanation.overview = `❌ Cache Miss: No record found in browser cache`;
          explanation.whatHappened = `The browser searched its DNS cache for "${domain}" but did not find any valid cached entry.`;
          explanation.technical = `Possible reasons for cache miss:\n• The domain has never been queried before by this browser\n• The previous cache entry expired (TTL reached zero)\n• Browser cache was cleared manually\n• Browser was recently started (cache is empty)\n• Domain was recently updated and old cache was invalidated`;
          explanation.whyItMatters = `Cache misses require the DNS resolver to check the next level in the hierarchy, adding latency to the resolution process.`;
          explanation.possibleIssues = [
            {
              issue: 'Cache Invalidation',
              description: 'If DNS records were recently changed, old cached values may persist until TTL expires',
              impact: 'Users may resolve to old IP addresses temporarily'
            }
          ];
          explanation.nextSteps = `The query will proceed to the OS resolver cache for the next lookup attempt.`;
        }
        break;

      case 'os_cache':
      case 'os':
        if (step.response?.found) {
          explanation.overview = `✅ OS Cache Hit: Domain found in operating system resolver cache`;
          explanation.whatHappened = `The operating system's DNS resolver cache contained a valid record for "${domain}". This cache is shared across all applications on the system.`;
          explanation.technical = `The OS resolver cache (managed by services like systemd-resolved on Linux, or DNS Client service on Windows) stores DNS responses system-wide. This cache:\n• Persists across browser restarts\n• Shared between all applications\n• Typically has longer TTL values than browser caches\n• Can be manually flushed (ipconfig /flushdns on Windows, systemd-resolve --flush-caches on Linux)`;
          explanation.whyItMatters = `OS-level caching reduces DNS traffic for all applications and provides faster resolution than network queries.`;
          explanation.performanceNotes = `⚡ Performance: Excellent (${step.timing}ms). Local cache lookup only.`;
          explanation.nextSteps = `The cached IP address is returned to the browser. Resolution complete.`;
        } else {
          explanation.overview = `❌ OS Cache Miss: No valid record in operating system cache`;
          explanation.whatHappened = `The OS resolver cache was checked but "${domain}" was not found or the cached entry had expired.`;
          explanation.technical = `OS cache miss reasons:\n• Domain never queried on this system\n• Cache entry TTL expired\n• DNS cache was manually flushed\n• System was recently rebooted\n• DNS record was recently modified`;
          explanation.possibleIssues = [
            {
              issue: 'Negative Caching',
              description: 'If a previous query failed (NXDOMAIN), the OS may cache this negative response',
              impact: 'Subsequent queries may fail immediately without network lookup until negative cache expires'
            }
          ];
          explanation.nextSteps = `Query will be forwarded to the configured recursive resolver (typically your ISP's DNS or public DNS like 8.8.8.8).`;
        }
        break;

      case 'recursive_query':
        explanation.overview = `📤 Forwarding query to recursive resolver`;
        explanation.whatHappened = `The client is sending a DNS query for "${domain}" to the recursive resolver at ${step.server?.ip || '8.8.8.8'}. This is the first network request in the resolution process.`;
        explanation.technical = `The recursive resolver is responsible for:\n• Handling the complete resolution process on behalf of the client\n• Querying root servers, TLD servers, and authoritative servers\n• Caching responses to speed up future queries\n• Returning the final answer to the client\n\nIn ${isRecursiveMode ? 'recursive' : 'iterative'} mode, the ${isRecursiveMode ? 'resolver does all the work' : 'client handles referrals itself'}.`;
        explanation.whyItMatters = `The recursive resolver's performance and reliability directly impact DNS resolution speed. Popular public resolvers like Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1) are optimized for speed and global reach.`;
        
        if (step.latency && step.latency > 100) {
          explanation.possibleIssues.push({
            issue: 'High Latency to Resolver',
            description: `Network latency to resolver is ${step.latency}ms, which is higher than optimal`,
            impact: 'Each DNS query will take longer, slowing down page loads',
            solution: 'Consider using a geographically closer DNS resolver or check network connectivity'
          });
        }

        if (step.packetLoss?.occurred) {
          explanation.possibleIssues.push({
            issue: 'Packet Loss Detected',
            description: `Query packet was lost at ${(step.packetLoss.lossPoint * 100).toFixed(0)}% of transmission`,
            impact: 'Query failed and requires retry, adding significant delay',
            solution: 'Check network stability. Multiple packet losses may indicate network issues'
          });
        }
        break;

      case 'root_query':
      case 'root_server':
        explanation.overview = `🌍 Querying Root DNS Server`;
        explanation.whatHappened = `${isIterativeMode ? 'The client' : 'The recursive resolver'} is querying a root nameserver to find which TLD (Top-Level Domain) server handles the ".${domain.split('.').pop()}" extension.`;
        explanation.technical = `Root nameservers are the first step in the DNS hierarchy:\n• There are 13 root server clusters (A through M) distributed globally via anycast\n• Root servers don't know individual domains, only which servers handle each TLD (.com, .org, .net, etc.)\n• Root servers respond with NS (nameserver) records pointing to TLD servers\n• This response is a "referral" not a final answer\n\nQueried root server: ${step.server?.ip || '198.41.0.4'} (${step.server?.name || 'a.root-servers.net'})`;
        explanation.whyItMatters = `Root servers are critical infrastructure for the entire internet. They're highly distributed and redundant to ensure DNS resolution never fails globally.`;
        
        if (step.response?.referral) {
          explanation.whatHappened += `\n\n✅ The root server responded with a referral to the TLD nameservers for ".${domain.split('.').pop()}".`;
          explanation.nextSteps = `Query will be sent to the TLD nameserver to find the authoritative nameserver for "${domain}".`;
        } else if (step.response?.found === false) {
          explanation.possibleIssues.push({
            issue: 'Root Server Failure',
            description: 'Root server did not respond or returned an error',
            impact: 'DNS resolution cannot proceed',
            solution: 'Retry with different root server. If problem persists, network connectivity issue likely'
          });
        }

        if (step.latency && step.latency > 200) {
          explanation.possibleIssues.push({
            issue: 'High Root Server Latency',
            description: `Latency to root server is ${step.latency}ms (optimal is < 50ms)`,
            impact: 'Slower DNS resolution',
            cause: 'Geographic distance to nearest root server or network congestion',
            solution: 'Anycast should route to nearest root server; consistent high latency may indicate routing issues'
          });
        }
        break;

      case 'tld_query':
      case 'tld_server':
        const tld = domain.split('.').pop();
        explanation.overview = `🏢 Querying TLD Nameserver for ".${tld}"`;
        explanation.whatHappened = `${isIterativeMode ? 'The client' : 'The recursive resolver'} is querying the TLD nameserver to find which authoritative nameserver handles "${domain}".`;
        explanation.technical = `TLD nameservers manage specific top-level domains:\n• .com and .net are managed by Verisign\n• .org is managed by Public Interest Registry\n• Country TLDs (.uk, .jp, .cn) are managed by respective country registries\n• Each TLD has multiple redundant nameservers globally\n\nTLD servers respond with NS records pointing to the domain's authoritative nameservers (set by domain registrar).`;
        explanation.whyItMatters = `TLD servers form the second level of DNS hierarchy and maintain the registry of all domains under their TLD. They must handle billions of queries daily.`;
        
        if (step.response?.referral) {
          explanation.whatHappened += `\n\n✅ The TLD server responded with nameserver records for "${domain}".`;
          explanation.nextSteps = `Query will be sent to the authoritative nameserver to get the final IP address.`;
        } else if (step.response?.found === false) {
          explanation.possibleIssues.push({
            issue: 'Domain Not Registered',
            description: `The TLD server has no record of "${domain}" in its registry`,
            impact: 'DNS resolution will fail with NXDOMAIN (non-existent domain)',
            cause: 'Domain was never registered, registration expired, or was recently deleted',
            solution: 'Verify domain name spelling. Check domain registration status at registrar.'
          });
        }

        if (step.dnssec && step.dnssec.validated === false) {
          explanation.possibleIssues.push({
            issue: 'DNSSEC Validation Failed',
            description: 'Digital signature verification failed for TLD response',
            impact: 'Response may be tampered with or DNS configuration error',
            security: 'CRITICAL - Potential DNS spoofing or misconfiguration',
            solution: 'Check DNSSEC chain. May need to investigate with domain registrar.'
          });
        }
        break;

      case 'authoritative_query':
      case 'authoritative_server':
        explanation.overview = `📋 Querying Authoritative Nameserver`;
        explanation.whatHappened = `${isIterativeMode ? 'The client' : 'The recursive resolver'} is querying the authoritative nameserver for "${domain}" to get the final answer.`;
        explanation.technical = `Authoritative nameservers:\n• Contain the actual DNS records for the domain (A, AAAA, MX, TXT, etc.)\n• Are configured by the domain owner\n• Typically hosted by DNS providers (Cloudflare, Route53, etc.) or self-hosted\n• Provide the definitive answer (not cached or referral)\n\nQuerying: ${step.server?.name || 'Authoritative NS'} (${step.server?.ip || 'N/A'})\nRecord type requested: ${step.query?.type || 'A'}`;
        explanation.whyItMatters = `This is the final step in DNS resolution. The authoritative server's response is the "source of truth" for the domain.`;
        
        if (step.response?.found) {
          const ipAddress = step.response?.answer?.data || step.response?.ip || 'N/A';
          explanation.whatHappened += `\n\n✅ Success! The authoritative server returned: ${ipAddress}`;
          explanation.nextSteps = `The IP address will be returned to the client${isRecursiveMode ? ' via the recursive resolver' : ''} and cached for future use (TTL: ${step.response?.ttl || 300}s).`;
        } else if (step.response?.found === false) {
          explanation.possibleIssues.push({
            issue: 'Record Not Found',
            description: `The authoritative server has no ${step.query?.type || 'A'} record for "${domain}"`,
            impact: 'DNS resolution fails for this record type',
            cause: `• No ${step.query?.type || 'A'} record configured for this domain\n• Record was recently deleted\n• Querying wrong record type`,
            solution: `Check DNS configuration at nameserver. Verify ${step.query?.type || 'A'} record exists.`
          });
        }

        if (step.latency && step.latency > 300) {
          explanation.possibleIssues.push({
            issue: 'Slow Authoritative Server',
            description: `Response time is ${step.latency}ms (optimal is < 100ms)`,
            impact: 'Slow DNS resolution affects all users of this domain',
            cause: 'Server overload, poor infrastructure, or geographic distance',
            solution: 'Consider using faster DNS providers or CDN with globally distributed nameservers'
          });
        }

        if (step.dnssec) {
          if (step.dnssec.validated) {
            explanation.technical += `\n\n🔒 DNSSEC: Response cryptographically verified. Chain of trust validated from root to authoritative server.`;
          } else {
            explanation.possibleIssues.push({
              issue: 'DNSSEC Validation Failure',
              description: 'Digital signature could not be verified',
              impact: 'Response authenticity cannot be guaranteed',
              security: 'CRITICAL - Potential DNS spoofing, MITM attack, or configuration error',
              solution: 'Verify DNSSEC keys. Check with DNS provider. May need to re-sign zone.'
            });
          }
        }
        break;

      case 'authoritative_response':
      case 'final_response':
        explanation.overview = `✅ DNS Resolution Complete`;
        const totalTime = allSteps.reduce((sum, s) => sum + (s.timing || 0), 0);
        const cacheSteps = allSteps.filter(s => s.stage.includes('cache')).length;
        const networkSteps = allSteps.filter(s => !s.stage.includes('cache')).length;
        
        explanation.whatHappened = `The DNS resolution for "${domain}" has completed successfully. The IP address is being returned to the client.`;
        explanation.technical = `Resolution Summary:\n• Total time: ${totalTime}ms\n• Cache lookups: ${cacheSteps}\n• Network queries: ${networkSteps}\n• Mode: ${isRecursiveMode ? 'Recursive (resolver handled all queries)' : 'Iterative (client handled each step)'}\n• Servers contacted: ${allSteps.filter(s => s.server).length}`;
        
        const ipAddress = step.response?.answer?.data || step.response?.ip || allSteps.find(s => s.response?.answer)?.response?.answer?.data;
        if (ipAddress) {
          explanation.whatHappened += `\n\nFinal Answer: ${ipAddress}`;
        }

        explanation.whyItMatters = `The resolved IP address will be cached at multiple levels (browser, OS, resolver) to speed up future requests. DNS resolution is now complete and the application can establish a connection to the server.`;
        
        if (totalTime < 50) {
          explanation.performanceNotes = `⚡ Excellent Performance: Resolution completed in ${totalTime}ms (likely cache hit)`;
        } else if (totalTime < 200) {
          explanation.performanceNotes = `✅ Good Performance: Resolution completed in ${totalTime}ms (normal for network queries)`;
        } else if (totalTime < 500) {
          explanation.performanceNotes = `⚠️ Moderate Performance: ${totalTime}ms is acceptable but could be faster`;
        } else {
          explanation.performanceNotes = `❌ Poor Performance: ${totalTime}ms is quite slow for DNS resolution`;
          explanation.possibleIssues.push({
            issue: 'Slow Overall Resolution',
            description: `Total resolution time of ${totalTime}ms exceeds recommended threshold`,
            impact: 'Users experience slower page loads',
            cause: 'Network latency, slow nameservers, or multiple failed attempts',
            solution: 'Investigate network path, consider faster DNS provider, enable caching'
          });
        }

        explanation.nextSteps = `The application can now use this IP address to establish a connection (HTTP, HTTPS, etc.). The result will be cached to avoid repeating this process.`;
        break;

      default:
        explanation.overview = `DNS Resolution Step: ${step.name || step.stage}`;
        explanation.whatHappened = step.description || `Processing ${step.stage} stage of DNS resolution.`;
        explanation.technical = `Stage: ${step.stage}\nTiming: ${step.timing}ms`;
    }

    
    if (step.packetLoss?.occurred) {
      explanation.possibleIssues.push({
        issue: '🔴 Packet Loss Simulated',
        description: `Network packet was dropped at ${(step.packetLoss.lossPoint * 100).toFixed(0)}% of transmission`,
        impact: 'Query failed and required retry',
        simulation: `This is a simulated failure. Attempt ${step.packetLoss.attempt || 1} of ${step.packetLoss.maxRetries || 3}`,
        realWorld: 'In production, packet loss can occur due to network congestion, router failures, or poor connectivity'
      });
    }

    if (step.packetLoss?.retriesNeeded) {
      explanation.possibleIssues.push({
        issue: '✅ Retry Successful',
        description: `After ${step.packetLoss.retriesNeeded} ${step.packetLoss.retriesNeeded === 1 ? 'retry' : 'retries'}, the query succeeded`,
        impact: `Added ${step.packetLoss.retriesNeeded * 50}ms delay due to retransmission`,
        learning: 'DNS clients implement exponential backoff and retry logic to handle transient network failures'
      });
    }

    return explanation;
  }, []);

  const drawVisualization = () => {
    if (!results || !results.steps || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    
    
    const width = Math.max(svgRef.current.clientWidth, 1200);
    const height = 600;

    svg.attr('width', width).attr('height', height);

    
    let g = svg.select('.zoom-group');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'zoom-group');
      
      
      const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
          setZoomTransform(event.transform);
        });

      svg.call(zoom);
    }

    const effectiveViewMode = isLiveMode ? 'network' : viewMode;
    if (effectiveViewMode === 'timeline') {
      
      g.selectAll('*').remove();
      drawTimelineView(g, width, height);
      return;
    }

    
    updateNetworkView(g, width, height);
  };

  
  const updateNetworkView = (g, width, height) => {
    const svg = d3.select(svgRef.current);

    
    
    const servers = [
      { id: 'client', name: 'Client', x: 100, y: height / 2, color: '#10b981', gradient: ['#10b981', '#059669'], ip: 'Local', type: 'Client Device', icon: '💻' },
      { id: 'browser_cache', name: 'Browser Cache', x: 250, y: 150, color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'], ip: 'Local', type: 'Browser DNS Cache', icon: '🗄️' },
      { id: 'os_cache', name: 'OS Cache', x: 250, y: 350, color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'], ip: 'Local', type: 'OS Resolver Cache', icon: '💾' },
      { id: 'recursive_resolver', name: 'Recursive Resolver', x: 450, y: height / 2, color: '#f59e0b', gradient: ['#f59e0b', '#d97706'], ip: '8.8.8.8', type: 'Recursive DNS Server', icon: '🔄' },
      { id: 'root', name: 'Root Server', x: 700, y: 150, color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'], ip: '198.41.0.4', type: 'Root Nameserver (.)', icon: '🌍' },
      { id: 'tld', name: 'TLD Server', x: 700, y: 300, color: '#ec4899', gradient: ['#ec4899', '#db2777'], ip: 'TLD NS', type: 'TLD Nameserver (.com, .org, etc)', icon: '🏢' },
      { id: 'authoritative', name: 'Authoritative Server', x: 700, y: 450, color: '#ef4444', gradient: ['#ef4444', '#dc2626'], ip: 'Auth NS', type: 'Authoritative Nameserver', icon: '📋' }
    ];

    
    const stepsToShow = isLiveMode
      ? results.steps
      : results.steps.slice(0, Math.min(displayStepIndex + 1, results.steps.length));
    const activeStepIndex = stepsToShow.length
      ? Math.min(displayStepIndex, stepsToShow.length - 1)
      : -1;

    const activeServerIds = new Set();
    stepsToShow.forEach(step => {
      if (step.stage.includes('cache')) activeServerIds.add(step.stage);
      else if (step.stage.includes('root')) activeServerIds.add('root');
      else if (step.stage.includes('tld')) activeServerIds.add('tld');
      else if (step.stage.includes('authoritative')) activeServerIds.add('authoritative');
      else if (step.stage.includes('recursive')) activeServerIds.add('recursive_resolver');
      activeServerIds.add('client');
    });

    
    const serverGroups = g.selectAll('.server')
      .data(servers)
      .enter()
      .append('g')
      .attr('class', 'server')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .on('mouseover', (event, d) => {
        const tooltipContent = `
          <div class="tooltip-content">
            <strong>${d.icon} ${d.name}</strong><br/>
            <span style="color: #a5b4fc;">Type: ${d.type}</span><br/>
            <span style="color: #86efac;">IP: ${d.ip}</span><br/>
            <span style="color: ${activeServerIds.has(d.id) ? '#4ade80' : '#94a3b8'};">
              ${activeServerIds.has(d.id) ? '✅ Active' : '⚪ Inactive'}
            </span>
          </div>
        `;
        showTooltip(event, tooltipContent);
      })
      .on('mouseout', (event, d) => {
        hideTooltip();
      });

    
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    
    servers.forEach(server => {
      const gradient = defs.append('radialGradient')
        .attr('id', `gradient-${server.id}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', server.gradient[0])
        .attr('stop-opacity', 1);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', server.gradient[1])
        .attr('stop-opacity', 0.8);
    });

    
    serverGroups.append('circle')
      .attr('class', 'server-circle')
      .attr('r', 0)
      .attr('fill', d => `url(#gradient-${d.id})`)
      .attr('opacity', d => activeServerIds.has(d.id) ? 0.95 : 0.4)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .style('filter', d => activeServerIds.has(d.id) 
        ? `drop-shadow(0 0 10px ${d.color}) drop-shadow(0 0 20px ${d.color}40)` 
        : 'none')
      .transition()
      .duration(600)
      .delay((d, i) => {
        const stepIndex = Array.from(activeServerIds).indexOf(d.id);
        return stepIndex >= 0 ? stepIndex * 200 : 0;
      })
      .ease(d3.easeBackOut)
      .attr('r', 50);

    
    serverGroups.append('circle')
      .attr('class', 'server-inner-glow')
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', d => activeServerIds.has(d.id) ? 0.3 : 0)
      .transition()
      .duration(600)
      .delay((d, i) => {
        const stepIndex = Array.from(activeServerIds).indexOf(d.id);
        return stepIndex >= 0 ? stepIndex * 200 + 100 : 100;
      })
      .attr('r', 35);

    
    serverGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 75)
      .attr('fill', '#ffffff')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.5px')
      .style('opacity', 0)
      .style('text-shadow', '0 2px 8px rgba(0,0,0,0.5)')
      .text(d => d.name)
      .transition()
      .duration(500)
      .delay((d, i) => {
        const stepIndex = Array.from(activeServerIds).indexOf(d.id);
        return stepIndex >= 0 ? stepIndex * 200 + 300 : 300;
      })
      .style('opacity', 1);

    
    serverGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 8)
      .attr('font-size', '28px')
      .style('opacity', 0)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))')
      .text(d => d.icon)
      .transition()
      .duration(500)
      .delay((d, i) => {
        const stepIndex = Array.from(activeServerIds).indexOf(d.id);
        return stepIndex >= 0 ? stepIndex * 200 + 400 : 400;
      })
      .style('opacity', 1);

    
    stepsToShow.forEach((step, index) => {
      const delay = index * 800;
      const colors = getScenarioColor(step);

      
      
      
      
      
      
      
      
      
      
      
      let sourceId = 'client';
      let targetId = 'recursive_resolver';
      
      const isRecursiveMode = results.mode === 'recursive' || !results.mode;
      const isIterativeMode = results.mode === 'iterative';

      
      if (step.stage === 'browser_cache' || step.stage.includes('browser')) {
        sourceId = 'client';
        targetId = 'browser_cache';
      } else if (step.stage === 'os_cache' || step.stage.includes('os')) {
        sourceId = 'client';
        targetId = 'os_cache';
      } 
      
      else if (step.stage === 'recursive_resolver') {
        sourceId = 'client';
        targetId = 'recursive_resolver';
      } 
      
      
      else if (step.stage === 'recursive_to_root_query') {
        sourceId = 'recursive_resolver';
        targetId = 'root';
      } else if (step.stage === 'root_to_recursive_response') {
        sourceId = 'root';
        targetId = 'recursive_resolver';
      } else if (step.stage === 'recursive_to_tld_query') {
        sourceId = 'recursive_resolver';
        targetId = 'tld';
      } else if (step.stage === 'tld_to_recursive_response') {
        sourceId = 'tld';
        targetId = 'recursive_resolver';
      } else if (step.stage === 'recursive_to_auth_query') {
        sourceId = 'recursive_resolver';
        targetId = 'authoritative';
      } else if (step.stage === 'auth_to_recursive_response') {
        sourceId = 'authoritative';
        targetId = 'recursive_resolver';
      } else if (step.stage === 'recursive_to_client_response') {
        sourceId = 'recursive_resolver';
        targetId = 'client';
      } 
      
      
      else if (step.stage === 'client_to_root_query') {
        sourceId = 'client';
        targetId = 'root';
      } else if (step.stage === 'root_to_client_response') {
        sourceId = 'root';
        targetId = 'client';
      } else if (step.stage === 'client_to_tld_query') {
        sourceId = 'client';
        targetId = 'tld';
      } else if (step.stage === 'tld_to_client_response') {
        sourceId = 'tld';
        targetId = 'client';
      } else if (step.stage === 'client_to_auth_query') {
        sourceId = 'client';
        targetId = 'authoritative';
      } else if (step.stage === 'auth_to_client_response') {
        sourceId = 'authoritative';
        targetId = 'client';
      }

      const source = servers.find(s => s.id === sourceId);
      const target = servers.find(s => s.id === targetId);

      if (source && target) {
        const isCurrentStep = activeStepIndex >= 0 && index === activeStepIndex;
        const lineColor = isCurrentStep ? colors.primary : (index < activeStepIndex ? '#131111ff' : '#444');
        const lineWidth = isCurrentStep ? 4 : 2;
        const lineOpacity = isCurrentStep ? 0.9 : (index < activeStepIndex ? 0.5 : 0.3);

        
        let dashArray = '0';
        if (step.response?.referral) dashArray = '10,5'; 
        if (step.response?.found === false && !step.response?.referral) dashArray = '5,5'; 

        
        let currentStepLineColor = lineColor;
        if (step.messageType === 'QUERY' || step.direction === 'request') {
          currentStepLineColor = '#3b82f6'; 
        } else if (step.messageType === 'RESPONSE' || step.direction === 'response') {
          currentStepLineColor = '#10b981'; 
        } else if (step.latency) {
          
          if (step.latency < 50) currentStepLineColor = '#10b981'; 
          else if (step.latency < 150) currentStepLineColor = '#fbbf24'; 
          else if (step.latency < 300) currentStepLineColor = '#f59e0b'; 
          else currentStepLineColor = '#ef4444'; 
        }

        const finalLineColor = currentStepLineColor;

        
        let arrowMarker = 'url(#arrowhead)'; 
        if (isCurrentStep) {
          if (step.messageType === 'QUERY' || step.direction === 'request') {
            arrowMarker = 'url(#arrowhead-query)'; 
          } else if (step.messageType === 'RESPONSE' || step.direction === 'response') {
            arrowMarker = 'url(#arrowhead-response)'; 
          }
        }

        
        const lineGradient = defs.append('linearGradient')
          .attr('id', `line-gradient-${index}`)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');
        
        lineGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', source.color)
          .attr('stop-opacity', 0.8);
        
        lineGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', target.color)
          .attr('stop-opacity', 0.8);

        
        const line = g.append('line')
          .attr('class', 'connection-line')
          .attr('x1', source.x)
          .attr('y1', source.y)
          .attr('x2', source.x)
          .attr('y2', source.y)
          .attr('stroke', isCurrentStep ? finalLineColor : `url(#line-gradient-${index})`)
          .attr('stroke-width', lineWidth)
          .attr('stroke-dasharray', dashArray)
          .attr('opacity', 0)
          .attr('marker-end', isCurrentStep ? arrowMarker : '')
          .style('filter', isCurrentStep ? `drop-shadow(0 0 8px ${finalLineColor}40)` : 'none')
          .on('mouseover', (event) => {
            const messageIcon = step.messageType === 'QUERY' ? '🔵' : step.messageType === 'RESPONSE' ? '🟢' : '🔄';
            const messageLabel = step.messageType === 'QUERY' ? 'DNS Query' : step.messageType === 'RESPONSE' ? 'DNS Response' : 'DNS Message';
            
            const tooltipContent = `
              <div class="tooltip-content">
                <strong>${messageIcon} ${step.name}</strong><br/>
                <span style="color: #a5b4fc;">From: ${source.name} → To: ${target.name}</span><br/>
                <span style="color: #c084fc;">Message: ${messageLabel}</span><br/>
                <span style="color: #fbbf24;">Type: ${step.query?.type || 'N/A'}</span><br/>
                <span style="color: #86efac;">Timing: ${step.timing}ms</span><br/>
                ${step.response ? `<span style="color: ${step.response?.found ? '#4ade80' : step.response?.referral ? '#fbbf24' : '#f87171'};">
                  ${step.response?.found ? '✅ Answer Found' : step.response?.referral ? '➡️ Referral to Next Server' : '❌ Not Found'}
                </span>` : ''}
                ${step.response?.glueRecords && step.response.glueRecords.length > 0 ? `<br/><span style="color: #fbbf24;">📎 Glue: ${step.response.glueRecords.map(g => g.ip).join(', ')}</span>` : ''}
              </div>
            `;
            showTooltip(event, tooltipContent);
          })
          .on('mouseout', hideTooltip);

        line.transition()
          .delay(delay)
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('opacity', lineOpacity)
          .attr('x2', target.x)
          .attr('y2', target.y);

        
        if (!isLiveMode && isCurrentStep && step.packetLoss?.occurred) {
          const lossPoint = step.packetLoss.lossPoint || 0.5;
          const lossX = source.x + (target.x - source.x) * lossPoint;
          const lossY = source.y + (target.y - source.y) * lossPoint;

          
          const lostPacket = g.append('circle')
            .attr('class', 'lost-packet')
            .attr('cx', source.x)
            .attr('cy', source.y)
            .attr('r', 0)
            .attr('fill', '#F44336')
            .attr('stroke', '#FFF')
            .attr('stroke-width', 2);

          lostPacket.transition()
            .duration(200)
            .attr('r', 10)
            .transition()
            .delay(delay)
            .duration(1000 * lossPoint)
            .ease(d3.easeCubicInOut)
            .attr('cx', lossX)
            .attr('cy', lossY)
            .on('end', function() {
              
              d3.select(this)
                .transition()
                .duration(100)
                .attr('cx', lossX - 5)
                .transition()
                .duration(100)
                .attr('cx', lossX + 5)
                .transition()
                .duration(100)
                .attr('cx', lossX)
                .transition()
                .duration(300)
                .attr('r', 20)
                .attr('opacity', 0)
                .remove();
            });

          
          const warningIcon = g.append('text')
            .attr('x', lossX)
            .attr('y', lossY)
            .attr('text-anchor', 'middle')
            .attr('dy', 5)
            .attr('font-size', '24px')
            .attr('opacity', 0)
            .text('⚠️');

          warningIcon.transition()
            .delay(delay + 1000 * lossPoint + 300)
            .duration(300)
            .attr('opacity', 1)
            .transition()
            .delay(2000)
            .duration(300)
            .attr('opacity', 0)
            .remove();

          
          if (step.packetLoss.attempt) {
            const retryLabel = g.append('text')
              .attr('x', (source.x + target.x) / 2)
              .attr('y', (source.y + target.y) / 2 - 20)
              .attr('text-anchor', 'middle')
              .attr('fill', '#F44336')
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('opacity', 0)
              .text(`Retry Attempt ${step.packetLoss.attempt} of ${step.packetLoss.maxRetries}`);

            retryLabel.transition()
              .delay(delay + 1000 * lossPoint)
              .duration(300)
              .attr('opacity', 1)
              .transition()
              .delay(2000)
              .duration(300)
              .attr('opacity', 0)
              .remove();
          }
        }
        
        else if (isCurrentStep) {
          const packetColor = step.response?.found ? '#10b981' : colors.primary;
          const animationDuration = step.latency ? Math.min(step.latency * 2, 2000) : 1000;

          
          const packetGradient = defs.append('radialGradient')
            .attr('id', `packet-gradient-${index}`)
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%');
          
          packetGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#ffffff')
            .attr('stop-opacity', 0.9);
          
          packetGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', packetColor)
            .attr('stop-opacity', 0.8);

          const packet = g.append('circle')
            .attr('class', 'animated-packet')
            .attr('cx', source.x)
            .attr('cy', source.y)
            .attr('r', 0)
            .attr('fill', `url(#packet-gradient-${index})`)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .style('filter', `drop-shadow(0 0 12px ${packetColor})`);

          
          const createTrailParticle = (progress) => {
            const trailX = source.x + (target.x - source.x) * progress;
            const trailY = source.y + (target.y - source.y) * progress;
            
            const particle = g.append('circle')
              .attr('class', 'trail-particle')
              .attr('cx', trailX)
              .attr('cy', trailY)
              .attr('r', 4)
              .attr('fill', packetColor)
              .attr('opacity', 0.6);
            
            particle.transition()
              .duration(400)
              .attr('r', 2)
              .attr('opacity', 0)
              .remove();
          };

          packet.transition()
            .duration(200)
            .attr('r', 12)
            .transition()
            .delay(delay + 200)
            .duration(animationDuration)
            .ease(d3.easeCubicInOut)
            .attr('cx', target.x)
            .attr('cy', target.y)
            .tween('trail', function() {
              return function(t) {
                if (t > 0 && t < 1 && Math.random() > 0.7) {
                  createTrailParticle(t);
                }
              };
            })
            .on('end', function() {
              
              for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const burstParticle = g.append('circle')
                  .attr('cx', target.x)
                  .attr('cy', target.y)
                  .attr('r', 3)
                  .attr('fill', packetColor);
                
                burstParticle.transition()
                  .duration(500)
                  .ease(d3.easeCircleOut)
                  .attr('cx', target.x + Math.cos(angle) * 30)
                  .attr('cy', target.y + Math.sin(angle) * 30)
                  .attr('r', 1)
                  .attr('opacity', 0)
                  .remove();
              }
              
              d3.select(this)
                .transition()
                .duration(300)
                .attr('r', 20)
                .attr('opacity', 0)
                .remove();
            });

          
          if (step.latency && step.latency > 200) {
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            
            const latencyIcon = g.append('text')
              .attr('x', midX)
              .attr('y', midY - 15)
              .attr('text-anchor', 'middle')
              .attr('font-size', '20px')
              .attr('opacity', 0)
              .text('⏳');

            latencyIcon.transition()
              .delay(delay + 200)
              .duration(300)
              .attr('opacity', 1)
              .transition()
              .delay(animationDuration - 600)
              .duration(300)
              .attr('opacity', 0)
              .remove();

            
            const timeCounter = g.append('text')
              .attr('x', midX)
              .attr('y', midY + 5)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FF9800')
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('opacity', 0)
              .text(`${step.latency}ms`);

            timeCounter.transition()
              .delay(delay + 200)
              .duration(300)
              .attr('opacity', 1)
              .transition()
              .delay(animationDuration - 600)
              .duration(300)
              .attr('opacity', 0)
              .remove();
          }

          
          if (step.packetLoss?.retriesNeeded) {
            const successLabel = g.append('text')
              .attr('x', (source.x + target.x) / 2)
              .attr('y', (source.y + target.y) / 2 - 20)
              .attr('text-anchor', 'middle')
              .attr('fill', '#4CAF50')
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('opacity', 0)
              .text(`✅ Success after ${step.packetLoss.retriesNeeded} ${step.packetLoss.retriesNeeded === 1 ? 'retry' : 'retries'}`);

            successLabel.transition()
              .delay(delay)
              .duration(300)
              .attr('opacity', 1)
              .transition()
              .delay(2000)
              .duration(300)
              .attr('opacity', 0)
              .remove();
          }

          
          if (step.response) {
            const responsePacket = g.append('circle')
              .attr('class', 'response-packet')
              .attr('cx', target.x)
              .attr('cy', target.y)
              .attr('r', 0)
              .attr('fill', step.response.found ? '#4CAF50' : '#FF9800')
              .attr('stroke', '#FFF')
              .attr('stroke-width', 2)
              .style('filter', 'drop-shadow(0 0 8px rgba(76,175,80,0.8))');

            responsePacket.transition()
              .delay(delay + 1200)
              .duration(200)
              .attr('r', 10)
              .transition()
              .duration(800)
              .ease(d3.easeCubicInOut)
              .attr('cx', source.x)
              .attr('cy', source.y)
              .on('end', function() {
                d3.select(this)
                  .transition()
                  .duration(300)
                  .attr('r', 15)
                  .attr('opacity', 0)
                  .remove();
              });
          }
        }
      }
    });

      
    if (stepsToShow.length > 0 && activeStepIndex >= 0) {
      const currentStepData = stepsToShow[activeStepIndex];
      const stage = currentStepData.stage;
      let activeServerId = 'client';

      
      
      
      
      if (stage === 'browser_cache' || stage.includes('browser')) {
        activeServerId = 'browser_cache';
      } else if (stage === 'os_cache' || stage.includes('os')) {
        activeServerId = 'os_cache';
      } 
      
      else if (stage === 'recursive_resolver') {
        activeServerId = 'recursive_resolver';
      } 
      
      else if (stage === 'recursive_to_root_query') {
        activeServerId = 'root';
      } else if (stage === 'root_to_recursive_response') {
        activeServerId = 'recursive_resolver';
      } else if (stage === 'recursive_to_tld_query') {
        activeServerId = 'tld';
      } else if (stage === 'tld_to_recursive_response') {
        activeServerId = 'recursive_resolver';
      } else if (stage === 'recursive_to_auth_query') {
        activeServerId = 'authoritative';
      } else if (stage === 'auth_to_recursive_response') {
        activeServerId = 'recursive_resolver';
      } else if (stage === 'recursive_to_client_response') {
        activeServerId = 'client';
      } 
      
      else if (stage === 'client_to_root_query') {
        activeServerId = 'root';
      } else if (stage === 'root_to_client_response') {
        activeServerId = 'client';
      } else if (stage === 'client_to_tld_query') {
        activeServerId = 'tld';
      } else if (stage === 'tld_to_client_response') {
        activeServerId = 'client';
      } else if (stage === 'client_to_auth_query') {
        activeServerId = 'authoritative';
      } else if (stage === 'auth_to_client_response') {
        activeServerId = 'client';
      }

      
      serverGroups.selectAll('.server-circle')
        .classed('active', d => d.id === activeServerId)
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr('stroke-width', d => d.id === activeServerId ? 5 : 3)
        .attr('opacity', d => d.id === activeServerId ? 1 : (activeServerIds.has(d.id) ? 0.7 : 0.3))
        .attr('r', d => d.id === activeServerId ? 55 : 50)
        .style('filter', d => {
          if (d.id === activeServerId) {
            return `drop-shadow(0 0 15px rgba(255,215,0,0.9)) drop-shadow(0 0 25px ${d.color})`;
          }
          return activeServerIds.has(d.id) ? `drop-shadow(0 0 5px ${d.color})` : 'none';
        });

      
      const activeServer = serverGroups.filter(d => d.id === activeServerId);
      
      
      g.selectAll('.active-ring').remove();
      
      
      const ring = activeServer.append('circle')
        .attr('class', 'active-ring')
        .attr('r', 55)
        .attr('fill', 'none')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 3)
        .attr('opacity', 0.8);

      
      ring.transition()
        .duration(1500)
        .ease(d3.easeCircleOut)
        .attr('r', 75)
        .attr('opacity', 0)
        .on('end', function() {
          d3.select(this).remove();
        });
    }

    
    const arrowDefs = svg.append('defs');
    
    
    arrowDefs.append('marker')
      .attr('id', 'arrowhead-query')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#3b82f6'); 
    
    
    arrowDefs.append('marker')
      .attr('id', 'arrowhead-response')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#10b981'); 
    
    
    arrowDefs.append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#FFD700');
  };

  
  const drawTimelineView = (g, width, height) => {
    const stepsToShow = results.steps.slice(0, currentStep + 1);
    const stepWidth = Math.min(120, (width - 100) / results.steps.length);
    const startX = 50;
    const centerY = height / 2;

    stepsToShow.forEach((step, index) => {
      const x = startX + index * stepWidth;
      const colors = getScenarioColor(step);
      const isCurrentStep = index === currentStep;

      
      const node = g.append('g')
        .attr('transform', `translate(${x}, ${centerY})`)
        .style('cursor', 'pointer')
        .on('click', () => setCurrentStep(index))
        .on('mouseover', (event) => {
          const tooltipContent = `
            <div class="tooltip-content">
              <strong>Step ${index + 1}: ${step.name}</strong><br/>
              <span>Stage: ${step.stage}</span><br/>
              <span>Timing: ${step.timing}ms</span>
            </div>
          `;
          showTooltip(event, tooltipContent);
        })
        .on('mouseout', hideTooltip);

      node.append('circle')
        .attr('r', isCurrentStep ? 25 : 15)
        .attr('fill', colors.primary)
        .attr('stroke', '#fff')
        .attr('stroke-width', isCurrentStep ? 3 : 2)
        .attr('opacity', isCurrentStep ? 1 : 0.7)
        .style('filter', isCurrentStep ? 'drop-shadow(0 0 10px rgba(255,215,0,0.8))' : 'none');

      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', '#fff')
        .attr('font-size', isCurrentStep ? '14px' : '10px')
        .attr('font-weight', 'bold')
        .text(index + 1);

      
      if (index < stepsToShow.length - 1) {
        g.append('line')
          .attr('x1', x + 15)
          .attr('y1', centerY)
          .attr('x2', x + stepWidth - 15)
          .attr('y2', centerY)
          .attr('stroke', '#888')
          .attr('stroke-width', 2)
          .attr('opacity', 0.5);
      }
    });
  };

  

  

  useEffect(() => {
    if (isLiveMode && viewMode !== 'network') {
      setViewMode('network');
    }
  }, [isLiveMode, viewMode]);

  if (!results || !results.steps) return null;

  const currentStepData = !isLiveMode ? results.steps[displayStepIndex] : null;
  const detailedExplanation = !isLiveMode && currentStepData 
    ? getDetailedExplanation(currentStepData, results.steps, displayStepIndex, results)
    : null;

  return (
    <div className="visualization-panel">
      <div className="panel-header">
        <h2>📊 DNS Resolution Flow</h2>
        <div className="view-controls">
          {isLiveMode && (
            <span className="live-indicator">🔴 Live Mode</span>
          )}
          <button
            className="legend-toggle"
            onClick={() => setShowLegend(!showLegend)}
          >
            {showLegend ? '🔽' : '🔼'} Legend
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="legend-panel">
          <h4>📖 Visual Legend & Guide</h4>
          
          <div className="legend-section">
            <h5>🎯 DNS Server Nodes (Colored Circles)</h5>
            <div className="legend-grid">
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}></div>
                <div className="legend-desc">
                  <strong>💻 Client (Green)</strong>
                  <span>Your device initiating DNS query</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #3b82f6, #2563eb)'}}></div>
                <div className="legend-desc">
                  <strong>🗄️ Browser Cache (Blue)</strong>
                  <span>Browser's internal DNS cache</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #06b6d4, #0891b2)'}}></div>
                <div className="legend-desc">
                  <strong>💾 OS Cache (Cyan)</strong>
                  <span>Operating system DNS cache</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}></div>
                <div className="legend-desc">
                  <strong>🔄 Recursive Resolver (Orange)</strong>
                  <span>DNS server that handles queries (e.g., 8.8.8.8)</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}></div>
                <div className="legend-desc">
                  <strong>🌍 Root Server (Purple)</strong>
                  <span>Top-level DNS server (13 clusters worldwide)</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #ec4899, #db2777)'}}></div>
                <div className="legend-desc">
                  <strong>🏢 TLD Server (Pink)</strong>
                  <span>Manages .com, .org, .net domains</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-circle" style={{background: 'linear-gradient(135deg, #ef4444, #dc2626)'}}></div>
                <div className="legend-desc">
                  <strong>📋 Authoritative Server (Red)</strong>
                  <span>Final server with actual DNS records</span>
                </div>
              </div>
            </div>
          </div>

          <div className="legend-section">
            <h5>🔀 Connection Lines & Arrows</h5>
            <div className="legend-grid">
              <div className="legend-item">
                <div className="legend-arrow" style={{background: '#3b82f6'}}></div>
                <div className="legend-desc">
                  <strong>Blue Arrow →</strong>
                  <span>DNS Query (request going TO server)</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-arrow" style={{background: '#10b981'}}></div>
                <div className="legend-desc">
                  <strong>Green Arrow →</strong>
                  <span>DNS Response (answer coming FROM server)</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-line line-solid"></div>
                <div className="legend-desc">
                  <strong>Solid Line</strong>
                  <span>Successful query with answer</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-line line-dashed"></div>
                <div className="legend-desc">
                  <strong>Dashed Line</strong>
                  <span>Referral to next DNS server</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-line line-dotted"></div>
                <div className="legend-desc">
                  <strong>Dotted Line</strong>
                  <span>Failed query or error</span>
                </div>
              </div>
            </div>
          </div>

          <div className="legend-section">
            <h5>✨ Animated Elements</h5>
            <div className="legend-grid">
              <div className="legend-item">
                <div className="legend-icon packet-query"></div>
                <div className="legend-desc">
                  <strong>Moving Circle</strong>
                  <span>Animated DNS packet traveling between servers</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-icon node-active" style={{border: '3px solid #FFD700', boxShadow: '0 0 10px #FFD700'}}></div>
                <div className="legend-desc">
                  <strong>Golden Ring</strong>
                  <span>Currently active server in this step</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-icon">⚠️</div>
                <div className="legend-desc">
                  <strong>Warning Icon</strong>
                  <span>Packet loss or network error</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-icon">⏳</div>
                <div className="legend-desc">
                  <strong>Hourglass</strong>
                  <span>High latency ({'>'}200ms delay)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="legend-note">
            {!isLiveMode ? (
              '💡 Tip: Use arrow keys to navigate, Space to play/pause, Home/End to jump'
            ) : (
              '🔴 Live mode updates in real time - watch DNS packets flow!'
            )}
          </div>
        </div>
      )}

      <div className="visualization-container" ref={containerRef}>
        <DynamicVisualization 
          results={results} 
          isLiveMode={isLiveMode} 
          currentStep={currentStep}
        />
        <div ref={tooltipRef} className="d3-tooltip"></div>
      </div>

      <div className="controls">
        {/* Local Play/Pause button removed; top-level control exists. */}
        {isLiveMode && (
          <span className="live-indicator">🔴 Live Mode</span>
        )}
      </div>

      {/* Removed step counter, scrubber, and detailed per-step explanation panel per request. */}

      {selectedNode && (
        <div className="node-detail-modal" onClick={() => setSelectedNode(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedNode(null)}>✕</button>
            <h3>🖥️ {selectedNode.name}</h3>
            <div className="modal-details">
              <p><strong>Type:</strong> {selectedNode.type}</p>
              <p><strong>IP Address:</strong> {selectedNode.ip}</p>
              <p><strong>Role:</strong> {selectedNode.name}</p>
              <p><strong>Status:</strong> Active in resolution</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualizationPanel;

