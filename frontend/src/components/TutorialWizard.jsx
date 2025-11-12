import React, { useState, useEffect } from 'react';
import '../styles/TutorialWizard.css';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: '🎓 Welcome to DNS Learning!',
    content: (
      <>
        <h3>What You'll Learn</h3>
        <p>This interactive tutorial will teach you how DNS (Domain Name System) works - the technology that translates domain names like "google.com" into IP addresses that computers can understand.</p>
        
        <div className="learning-objectives">
          <h4>By the end of this tutorial, you'll understand:</h4>
          <ul>
            <li>✅ How DNS translates domain names to IP addresses</li>
            <li>✅ The difference between recursive and iterative resolution</li>
            <li>✅ How DNS caching improves performance</li>
            <li>✅ The role of different DNS servers (Root, TLD, Authoritative)</li>
            <li>✅ How DNSSEC protects against attacks</li>
          </ul>
        </div>

        <div className="fun-fact">
          <span className="fact-icon">💡</span>
          <p><strong>Did you know?</strong> DNS is often called the "phonebook of the internet" because it helps you find websites just like a phonebook helps you find phone numbers!</p>
        </div>
      </>
    ),
    action: null,
    highlightElement: null
  },
  {
    id: 'what-is-dns',
    title: '🌐 What is DNS?',
    content: (
      <>
        <h3>The Problem DNS Solves</h3>
        <p>Computers communicate using IP addresses (like <code>142.250.185.46</code>), but humans prefer memorable names (like <code>google.com</code>). DNS bridges this gap!</p>
        
        <div className="example-box">
          <h4>Example: What happens when you type "google.com"?</h4>
          <div className="steps-flow">
            <div className="flow-step">
              <span className="step-num">1</span>
              <p>You type: <code>google.com</code></p>
            </div>
            <span className="arrow">→</span>
            <div className="flow-step">
              <span className="step-num">2</span>
              <p>DNS translates</p>
            </div>
            <span className="arrow">→</span>
            <div className="flow-step">
              <span className="step-num">3</span>
              <p>Result: <code>142.250.185.46</code></p>
            </div>
            <span className="arrow">→</span>
            <div className="flow-step">
              <span className="step-num">4</span>
              <p>Browser connects!</p>
            </div>
          </div>
        </div>

        <div className="analogy">
          <h4>📖 Real-World Analogy</h4>
          <p>DNS is like asking for directions:</p>
          <ul>
            <li><strong>Domain Name</strong> = "Coffee shop on Main Street"</li>
            <li><strong>IP Address</strong> = "123 Main Street, Building 5"</li>
            <li><strong>DNS</strong> = The person who tells you the exact address</li>
          </ul>
        </div>
      </>
    ),
    action: null,
    highlightElement: null
  },
  {
    id: 'dns-hierarchy',
    title: '🏗️ The DNS Hierarchy',
    content: (
      <>
        <h3>DNS is Organized Like a Tree</h3>
        <p>DNS uses a hierarchical structure, starting from the root and going down to specific domains.</p>
        
        <div className="hierarchy-visual">
          <div className="tree-level root-level">
            <div className="tree-node">
              <span className="node-icon">🌍</span>
              <span className="node-label">Root (.)</span>
            </div>
          </div>
          
          <div className="tree-connector"></div>
          
          <div className="tree-level tld-level">
            <div className="tree-node">
              <span className="node-icon">🏢</span>
              <span className="node-label">.com</span>
            </div>
            <div className="tree-node">
              <span className="node-icon">🏢</span>
              <span className="node-label">.org</span>
            </div>
            <div className="tree-node">
              <span className="node-icon">🏢</span>
              <span className="node-label">.net</span>
            </div>
          </div>
          
          <div className="tree-connector"></div>
          
          <div className="tree-level domain-level">
            <div className="tree-node">
              <span className="node-icon">📋</span>
              <span className="node-label">google.com</span>
            </div>
            <div className="tree-node">
              <span className="node-icon">📋</span>
              <span className="node-label">wikipedia.org</span>
            </div>
            <div className="tree-node">
              <span className="node-icon">📋</span>
              <span className="node-label">cloudflare.net</span>
            </div>
          </div>
        </div>

        <div className="info-boxes">
          <div className="info-box">
            <h4>🌍 Root Servers</h4>
            <p>13 clusters worldwide that know about all TLDs (.com, .org, etc.)</p>
          </div>
          <div className="info-box">
            <h4>🏢 TLD Servers</h4>
            <p>Manage specific extensions like .com, .org, .edu</p>
          </div>
          <div className="info-box">
            <h4>📋 Authoritative Servers</h4>
            <p>Have the actual IP addresses for specific domains</p>
          </div>
        </div>
      </>
    ),
    action: null,
    highlightElement: null
  },
  {
    id: 'caching',
    title: '💾 DNS Caching',
    content: (
      <>
        <h3>Speed Through Memory</h3>
        <p>To make DNS faster, computers save (cache) recent lookups. This means you don't have to ask the internet every time!</p>
        
        <div className="cache-layers">
          <div className="cache-layer">
            <div className="layer-header">
              <span className="layer-icon">🌐</span>
              <h4>Browser Cache</h4>
            </div>
            <div className="layer-details">
              <p><strong>Speed:</strong> &lt;1ms ⚡⚡⚡</p>
              <p><strong>Lifetime:</strong> 5-30 minutes</p>
              <p><strong>Location:</strong> Your browser's memory</p>
            </div>
          </div>

          <div className="cache-arrow">↓ If not found</div>

          <div className="cache-layer">
            <div className="layer-header">
              <span className="layer-icon">💻</span>
              <h4>OS Cache</h4>
            </div>
            <div className="layer-details">
              <p><strong>Speed:</strong> 1-10ms ⚡⚡</p>
              <p><strong>Lifetime:</strong> 10-60 minutes</p>
              <p><strong>Location:</strong> Your operating system</p>
            </div>
          </div>

          <div className="cache-arrow">↓ If not found</div>

          <div className="cache-layer">
            <div className="layer-header">
              <span className="layer-icon">🔄</span>
              <h4>Recursive Resolver Cache</h4>
            </div>
            <div className="layer-details">
              <p><strong>Speed:</strong> 20-50ms ⚡</p>
              <p><strong>Lifetime:</strong> 1-24 hours</p>
              <p><strong>Location:</strong> Your ISP or public DNS (8.8.8.8)</p>
            </div>
          </div>

          <div className="cache-arrow">↓ If not found</div>

          <div className="cache-layer authoritative">
            <div className="layer-header">
              <span className="layer-icon">🌍</span>
              <h4>Full DNS Query</h4>
            </div>
            <div className="layer-details">
              <p><strong>Speed:</strong> 50-200ms 🐢</p>
              <p><strong>Process:</strong> Query Root → TLD → Authoritative</p>
            </div>
          </div>
        </div>

        <div className="fun-fact">
          <span className="fact-icon">💡</span>
          <p><strong>Fun Fact:</strong> Most DNS queries are answered from cache! Only about 10-20% require a full internet query.</p>
        </div>
      </>
    ),
    action: null,
    highlightElement: null
  },
  {
    id: 'recursive-vs-iterative',
    title: '🔄 Resolution Modes',
    content: (
      <>
        <h3>Two Ways to Find an Answer</h3>
        
        <div className="comparison">
          <div className="comparison-column recursive">
            <h4>🔄 Recursive Resolution</h4>
            <p className="subtitle">The DNS server does all the work</p>
            
            <div className="flow-diagram">
              <div className="flow-item">
                <span className="actor">You</span>
                <span className="arrow">→</span>
                <span className="actor">Recursive Resolver</span>
                <p className="message">"What is google.com?"</p>
              </div>
              
              <div className="flow-item internal">
                <p className="note">Resolver does the work internally:</p>
                <ul>
                  <li>Queries Root Server</li>
                  <li>Queries TLD Server</li>
                  <li>Queries Authoritative Server</li>
                </ul>
              </div>
              
              <div className="flow-item">
                <span className="actor">Recursive Resolver</span>
                <span className="arrow">→</span>
                <span className="actor">You</span>
                <p className="message">"Here's the answer!"</p>
              </div>
            </div>
            
            <div className="mode-benefits">
              <p><strong>✅ Pros:</strong></p>
              <ul>
                <li>Simple for you</li>
                <li>All users benefit from caching</li>
                <li>Faster on repeat queries</li>
              </ul>
            </div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="comparison-column iterative">
            <h4>🔁 Iterative Resolution</h4>
            <p className="subtitle">You do all the work yourself</p>
            
            <div className="flow-diagram">
              <div className="flow-item">
                <span className="actor">You</span>
                <span className="arrow">→</span>
                <span className="actor">Root Server</span>
                <p className="message">"Ask .com server"</p>
              </div>
              
              <div className="flow-item">
                <span className="actor">You</span>
                <span className="arrow">→</span>
                <span className="actor">TLD Server</span>
                <p className="message">"Ask google's server"</p>
              </div>
              
              <div className="flow-item">
                <span className="actor">You</span>
                <span className="arrow">→</span>
                <span className="actor">Authoritative</span>
                <p className="message">"Here's the IP!"</p>
              </div>
            </div>
            
            <div className="mode-benefits">
              <p><strong>✅ Pros:</strong></p>
              <ul>
                <li>More control</li>
                <li>Better for debugging</li>
                <li>See each step clearly</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="when-to-use">
          <h4>When is each mode used?</h4>
          <ul>
            <li><strong>Recursive:</strong> Default for browsers, apps, and most devices</li>
            <li><strong>Iterative:</strong> DNS troubleshooting tools (dig, nslookup), DNS servers</li>
          </ul>
        </div>
      </>
    ),
    action: {
      label: 'Try changing resolution mode →',
      target: 'config-panel'
    },
    highlightElement: '.config-panel'
  },
  {
    id: 'record-types',
    title: '📝 DNS Record Types',
    content: (
      <>
        <h3>Different Types of DNS Information</h3>
        <p>DNS doesn't just store IP addresses! It stores many types of information about domains.</p>
        
        <div className="record-types-grid">
          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">🔢</span>
              <h4>A Record</h4>
            </div>
            <p className="record-desc">IPv4 address (most common)</p>
            <div className="record-example">
              <code>google.com → 142.250.185.46</code>
            </div>
          </div>

          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">🔢</span>
              <h4>AAAA Record</h4>
            </div>
            <p className="record-desc">IPv6 address (newer)</p>
            <div className="record-example">
              <code>google.com → 2607:f8b0:4004:...</code>
            </div>
          </div>

          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">🔀</span>
              <h4>CNAME Record</h4>
            </div>
            <p className="record-desc">Alias (points to another domain)</p>
            <div className="record-example">
              <code>www.example.com → example.com</code>
            </div>
          </div>

          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">📧</span>
              <h4>MX Record</h4>
            </div>
            <p className="record-desc">Mail server address</p>
            <div className="record-example">
              <code>example.com → mail.example.com</code>
            </div>
          </div>

          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">🏢</span>
              <h4>NS Record</h4>
            </div>
            <p className="record-desc">Nameserver for the domain</p>
            <div className="record-example">
              <code>example.com → ns1.example.com</code>
            </div>
          </div>

          <div className="record-card">
            <div className="record-header">
              <span className="record-icon">📄</span>
              <h4>TXT Record</h4>
            </div>
            <p className="record-desc">Text information (SPF, DKIM, etc.)</p>
            <div className="record-example">
              <code>v=spf1 include:_spf.google.com</code>
            </div>
          </div>
        </div>

        <div className="practical-use">
          <h4>💼 Real-World Uses</h4>
          <ul>
            <li><strong>A/AAAA:</strong> Website hosting, connecting to servers</li>
            <li><strong>CNAME:</strong> www subdomain, CDN setup</li>
            <li><strong>MX:</strong> Email delivery (Gmail, Outlook)</li>
            <li><strong>TXT:</strong> Email security (SPF, DKIM), domain verification</li>
          </ul>
        </div>
      </>
    ),
    action: {
      label: 'Try different record types →',
      target: 'config-panel'
    },
    highlightElement: '.config-panel'
  },
  {
    id: 'dnssec',
    title: '🔒 DNS Security (DNSSEC)',
    content: (
      <>
        <h3>Protecting DNS from Attackers</h3>
        <p>DNSSEC adds digital signatures to DNS records to ensure they haven't been tampered with.</p>
        
        <div className="threat-scenario">
          <h4>⚠️ The Problem: DNS Spoofing</h4>
          <div className="attack-flow">
            <div className="attack-step bad">
              <span className="step-num">1</span>
              <p>You ask: "What is bank.com?"</p>
            </div>
            <div className="attack-step bad">
              <span className="step-num">2</span>
              <p>🦹 Attacker intercepts and lies</p>
            </div>
            <div className="attack-step bad">
              <span className="step-num">3</span>
              <p>You get: "123.45.67.89" (fake!)</p>
            </div>
            <div className="attack-step bad">
              <span className="step-num">4</span>
              <p>You connect to attacker's server!</p>
            </div>
          </div>
        </div>

        <div className="solution">
          <h4>✅ The Solution: DNSSEC</h4>
          <p>DNSSEC creates a "chain of trust" using cryptographic signatures</p>
          
          <div className="trust-chain">
            <div className="trust-link">
              <span className="link-icon">🔐</span>
              <div className="link-content">
                <h5>Root DNSKEY</h5>
                <p>Trust anchor (pre-configured)</p>
              </div>
            </div>
            <div className="chain-arrow">↓ signs</div>
            <div className="trust-link">
              <span className="link-icon">🔑</span>
              <div className="link-content">
                <h5>TLD DS Record</h5>
                <p>Delegation Signer for .com</p>
              </div>
            </div>
            <div className="chain-arrow">↓ signs</div>
            <div className="trust-link">
              <span className="link-icon">✅</span>
              <div className="link-content">
                <h5>Domain RRSIG</h5>
                <p>Signature on actual records</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dnssec-benefits">
          <h4>Benefits of DNSSEC</h4>
          <div className="benefit-grid">
            <div className="benefit">
              <span>✅</span>
              <p>Authenticity: Verify responses are from the real domain owner</p>
            </div>
            <div className="benefit">
              <span>✅</span>
              <p>Integrity: Detect if responses were tampered with</p>
            </div>
            <div className="benefit">
              <span>❌</span>
              <p>NOT Encrypted: DNSSEC doesn't hide your queries (use DoH for that)</p>
            </div>
          </div>
        </div>
      </>
    ),
    action: {
      label: 'Try enabling DNSSEC →',
      target: 'config-panel'
    },
    highlightElement: '.config-panel'
  },
  {
    id: 'hands-on',
    title: '🎮 Try It Yourself!',
    content: (
      <>
        <h3>Time to Experiment!</h3>
        <p>Now that you understand DNS, let's put your knowledge into practice with some hands-on exercises.</p>
        
        <div className="exercises">
          <div className="exercise">
            <h4>Exercise 1: Cache Hit vs Miss</h4>
            <div className="exercise-steps">
              <ol>
                <li>Query <code>google.com</code> (first time)</li>
                <li>Watch it go through all DNS servers</li>
                <li>Query <code>google.com</code> again immediately</li>
                <li>Notice how fast it is from cache! ⚡</li>
              </ol>
            </div>
            <div className="expected-result">
              <strong>Expected:</strong> First query ~150ms, Second query &lt;10ms
            </div>
          </div>

          <div className="exercise">
            <h4>Exercise 2: Recursive vs Iterative</h4>
            <div className="exercise-steps">
              <ol>
                <li>Set mode to <strong>Recursive</strong></li>
                <li>Query any domain and count the steps</li>
                <li>Change to <strong>Iterative</strong></li>
                <li>Query the same domain again</li>
                <li>Compare the difference!</li>
              </ol>
            </div>
            <div className="expected-result">
              <strong>Expected:</strong> See how resolver hides internal steps in recursive mode
            </div>
          </div>

          <div className="exercise">
            <h4>Exercise 3: Network Challenges</h4>
            <div className="exercise-steps">
              <ol>
                <li>Set <strong>Packet Loss</strong> to 30%</li>
                <li>Set <strong>Latency</strong> to 200ms</li>
                <li>Query a domain</li>
                <li>Watch retry mechanisms and delays</li>
              </ol>
            </div>
            <div className="expected-result">
              <strong>Expected:</strong> See exponential backoff and retry strategies
            </div>
          </div>

          <div className="exercise">
            <h4>Exercise 4: DNSSEC Validation</h4>
            <div className="exercise-steps">
              <ol>
                <li>Enable <strong>DNSSEC</strong></li>
                <li>Query a domain</li>
                <li>Explore the chain of trust visualization</li>
                <li>Try enabling "Simulate DNSSEC Failure"</li>
                <li>See what happens when validation fails!</li>
              </ol>
            </div>
            <div className="expected-result">
              <strong>Expected:</strong> Understand how signatures protect against attacks
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h4>🎓 Keep Learning</h4>
          <ul>
            <li>Try different domain names and record types</li>
            <li>Experiment with all configuration options</li>
            <li>Read the detailed explanations for each step</li>
            <li>Check out the "Why This Matters" sections</li>
            <li>Explore DNS packet structures</li>
          </ul>
        </div>
      </>
    ),
    action: {
      label: 'Start exploring! →',
      target: 'query-input'
    },
    highlightElement: '.query-input'
  },
  {
    id: 'completion',
    title: '🎉 Congratulations!',
    content: (
      <>
        <h3>You've Completed the DNS Tutorial!</h3>
        
        <div className="completion-message">
          <div className="achievement-badge">
            <span className="badge-icon">🏆</span>
            <h4>DNS Expert</h4>
            <p>You now understand how the internet's phonebook works!</p>
          </div>
        </div>

        <div className="knowledge-checklist">
          <h4>What You've Learned:</h4>
          <ul className="checklist">
            <li>✅ DNS translates domain names to IP addresses</li>
            <li>✅ DNS uses a hierarchical structure (Root → TLD → Authoritative)</li>
            <li>✅ Caching at multiple levels speeds up resolution</li>
            <li>✅ Recursive mode is simple, iterative mode provides control</li>
            <li>✅ Different record types serve different purposes</li>
            <li>✅ DNSSEC protects against DNS spoofing attacks</li>
            <li>✅ Network conditions affect DNS performance</li>
          </ul>
        </div>

        <div className="further-learning">
          <h4>📚 Want to Learn More?</h4>
          <div className="resources">
            <a href="https://www.cloudflare.com/learning/dns/what-is-dns/" target="_blank" rel="noopener noreferrer" className="resource-link">
              <span>🔗</span> Cloudflare DNS Learning Center
            </a>
            <a href="https://howdns.works/" target="_blank" rel="noopener noreferrer" className="resource-link">
              <span>🔗</span> How DNS Works (Comic)
            </a>
            <a href="https://www.youtube.com/watch?v=72snZctFFtA" target="_blank" rel="noopener noreferrer" className="resource-link">
              <span>🔗</span> DNS Explained (Video)
            </a>
          </div>
        </div>

        <div className="call-to-action">
          <p>Now go ahead and explore the simulator! Try querying different domains, experiment with settings, and dive deep into the DNS resolution process.</p>
          <p className="encouragement">Happy exploring! 🚀</p>
        </div>
      </>
    ),
    action: null,
    highlightElement: null
  }
];

function TutorialWizard({ onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    
    if (step.highlightElement) {
      const element = document.querySelector(step.highlightElement);
      if (element) {
        element.classList.add('tutorial-highlight');
      }
    }

    
    return () => {
      if (step.highlightElement) {
        const element = document.querySelector(step.highlightElement);
        if (element) {
          element.classList.remove('tutorial-highlight');
        }
      }
    };
  }, [currentStep, step.highlightElement]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (onClose) onClose();
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
    
    localStorage.setItem('dnsSimulatorTutorialCompleted', 'true');
  };

  const jumpToStep = (index) => {
    setCurrentStep(index);
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-wizard">
        <div className="tutorial-header">
          <div className="tutorial-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="progress-text">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </p>
          </div>
          <button className="tutorial-close" onClick={handleSkip} title="Skip tutorial">
            ✕
          </button>
        </div>

        <div className="tutorial-content">
          <div className="tutorial-step">
            <h2>{step.title}</h2>
            <div className="step-content">
              {step.content}
            </div>
          </div>
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-dots">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => jumpToStep(index)}
                title={`Go to step ${index + 1}`}
              >
                {index < currentStep ? '✓' : ''}
              </button>
            ))}
          </div>

          <div className="tutorial-nav">
            <button 
              className="tutorial-button secondary" 
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              ← Previous
            </button>

            {step.action && (
              <button 
                className="tutorial-button action" 
                onClick={handleNext}
              >
                {step.action.label}
              </button>
            )}

            <button 
              className="tutorial-button primary" 
              onClick={handleNext}
            >
              {isLastStep ? '🎉 Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TutorialWizard;
