import React, { useState } from 'react';
import '../styles/QueryInput.css';

function QueryInput({ onResolve, loading }) {
  const [domain, setDomain] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (domain.trim()) {
      onResolve(domain.trim());
    }
  };

  const exampleDomains = ['google.com', 'github.com', 'cloudflare.com', 'amazon.com'];

  const handleExampleClick = (example) => {
    setDomain(example);
  };

  return (
    <div className="query-input-container">
      <h2>DNS Query</h2>
      {}
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-group">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter domain name (e.g., example.com)"
            disabled={loading}
            className="domain-input"
          />
        </div>

        <div className="examples">
          <span>Try:</span>
          {exampleDomains.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="example-button"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>

        <button type="submit" disabled={loading || !domain.trim()} className="resolve-button bottom">
          {loading ? 'Resolving...' : 'Resolve'}
        </button>
      </form>
    </div>
  );
}

export default QueryInput;

