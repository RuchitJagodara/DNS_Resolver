import React, { useState, useEffect } from 'react';
import QueryInput from './components/QueryInput';
import ConfigPanel from './components/ConfigPanel';
import VisualizationPanel from './components/VisualizationPanel';
import ResultsPanel from './components/ResultsPanel';
import DNSSECChainVisualization from './components/DNSSECChainVisualization';
import TutorialWizard from './components/TutorialWizard';
import DNSGlossary from './components/DNSGlossary';
import AttackScenariosPanel from './components/AttackScenariosPanel';
import SecurityProtocolsPanel from './components/SecurityProtocolsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { resolveDNS } from './services/api';
import './styles/App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showAttackScenarios, setShowAttackScenarios] = useState(false);
  const [showSecurityProtocols, setShowSecurityProtocols] = useState(false);
  const [config, setConfig] = useState({
    queryMode: 'deterministic',
    mode: 'recursive',
    recordType: 'A',
    cacheEnabled: false,
    cacheTTL: 300,
    networkLatency: 50,
    packetLoss: 0,
    dnssecEnabled: false,
    simulateDNSSECFailure: false,
    customDNS: null,
    simulateFailures: false,
    useRealDelegation: false
  });

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('dnsSimulatorTutorialCompleted');
    if (!tutorialCompleted) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleResolve = async (domain) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await resolveDNS(domain, config.recordType, config.mode, config);
      const resultsWithConfig = { ...data, config: config };
      setResults(resultsWithConfig);
    } catch (err) {
      console.error('DNS Resolution Error:', err);
      setError(err.message || 'Failed to resolve DNS query');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🌐 DNS Resolution Simulator</h1>
         
          <div className={`mode-indicator ${config.queryMode}`}>
            {config.queryMode === 'live' ? (
              <>
                <span className="mode-icon">🌐</span>
                <span className="mode-text">LIVE MODE - Real DNS Queries</span>
              </>
            ) : (
              <>
                <span className="mode-icon">🎯</span>
                <span className="mode-text">DETERMINISTIC MODE - Simulated Queries</span>
              </>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="header-btn tutorial-btn"
            onClick={() => setShowTutorial(true)}
            title="Start Tutorial"
          >
            🎓 Tutorial
          </button>
          <button 
            className="header-btn glossary-btn"
            onClick={() => setShowGlossary(true)}
            title="Open DNS Glossary"
          >
            📚 Glossary
          </button>
          <button 
            className="header-btn attack-btn"
            onClick={() => setShowAttackScenarios(true)}
            title="View DNS Attack Scenarios"
          >
            🛡️ Attack Scenarios
          </button>
          <button 
            className="header-btn security-btn"
            onClick={() => setShowSecurityProtocols(true)}
            title="Learn DNS Security Protocols"
          >
            🔐 Security Protocols
          </button>
        </div>
      </header>

      <div className="app-container">
        <div className="left-panel">
          <QueryInput onResolve={handleResolve} loading={loading} />
          <ConfigPanel config={config} onChange={handleConfigChange} />
        </div>

        <div className="main-panel">
          <ErrorBoundary>
            {error && (
              <div className="error-message">
                <h3>❌ Error</h3>
                <p>{error}</p>
              </div>
            )}

            {loading && (
              <div className="loading-message">
                <div className="spinner"></div>
                <p>Resolving DNS query...</p>
              </div>
            )}

            {results && !loading && (
              <>
                {}
                <VisualizationPanel results={results} config={config} />
                
                {config.dnssecEnabled && results.steps && results.steps.some(s => s.dnssec) && (
                  <DNSSECChainVisualization
                    dnssecSteps={results.steps.filter(s => s.dnssec)}
                  />
                )}
                
                <ResultsPanel results={results} config={config} />
              </>
            )}

            {!results && !loading && !error && (
              <div className="welcome-message">
                <h2>Welcome to DNS Resolution Simulator</h2>
                <p>Enter a domain name above to start visualizing the DNS resolution process</p>
                <div className="features">
                  <div className="feature">
                    <span className="icon">🔄</span>
                    <h3>Recursive & Iterative</h3>
                    <p>Simulate both resolution modes</p>
                  </div>
                  <div className="feature">
                    <span className="icon">📊</span>
                    <h3>Visual Flow</h3>
                    <p>Animated packet flow diagrams</p>
                  </div>
                  <div className="feature">
                    <span className="icon">🔒</span>
                    <h3>DNSSEC Support</h3>
                    <p>Security validation steps</p>
                  </div>
                  <div className="feature">
                    <span className="icon">⚙️</span>
                    <h3>Configurable</h3>
                    <p>Adjust cache, latency, and more</p>
                  </div>
                </div>
                
                <div className="quick-start-tip">
                  <span className="tip-icon">💡</span>
                  <p>New to DNS? <button className="inline-link" onClick={() => setShowTutorial(true)}>Start the interactive tutorial</button> to learn the basics!</p>
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      {}
      {showTutorial && (
        <TutorialWizard 
          onClose={() => setShowTutorial(false)}
          onComplete={() => {
            setShowTutorial(false);
          }}
        />
      )}

      {}
      <DNSGlossary 
        isOpen={showGlossary}
        onClose={() => setShowGlossary(false)}
      />

      {}
      {showAttackScenarios && (
        <AttackScenariosPanel 
          onClose={() => setShowAttackScenarios(false)}
        />
      )}

      {}
      {showSecurityProtocols && (
        <SecurityProtocolsPanel 
          onClose={() => setShowSecurityProtocols(false)}
        />
      )}
    </div>
  );
}

export default App;