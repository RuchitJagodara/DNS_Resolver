import React, { useState, useMemo } from 'react';
import '../styles/DNSGlossary.css';

const DNS_TERMS = [
  {
    term: 'A Record',
    category: 'Record Types',
    definition: 'Maps a domain name to an IPv4 address (32-bit).',
    example: 'google.com → 142.250.185.46',
    icon: '🔢',
    relatedTerms: ['AAAA Record', 'IPv4', 'DNS Resolution']
  },
  {
    term: 'AAAA Record',
    category: 'Record Types',
    definition: 'Maps a domain name to an IPv6 address (128-bit).',
    example: 'google.com → 2607:f8b0:4004:...',
    icon: '🔢',
    relatedTerms: ['A Record', 'IPv6', 'Dual Stack']
  },
  {
    term: 'Authoritative Server',
    category: 'DNS Infrastructure',
    definition: 'A DNS server that has the definitive DNS records for a domain. It provides authoritative answers, not cached responses.',
    example: 'ns1.google.com is an authoritative server for google.com',
    icon: '📋',
    relatedTerms: ['Nameserver', 'Zone File', 'SOA Record']
  },
  {
    term: 'Cache',
    category: 'Performance',
    definition: 'Temporary storage of DNS query results to speed up future lookups. Exists at multiple levels: browser, OS, and resolver.',
    example: 'First query: 150ms, Cached query: <10ms',
    icon: '💾',
    relatedTerms: ['TTL', 'Browser Cache', 'Recursive Resolver']
  },
  {
    term: 'CNAME Record',
    category: 'Record Types',
    definition: 'Canonical Name record that creates an alias from one domain to another.',
    example: 'www.example.com → example.com',
    icon: '🔀',
    relatedTerms: ['Alias', 'A Record', 'Domain Name']
  },
  {
    term: 'DNS (Domain Name System)',
    category: 'Fundamentals',
    definition: 'The internet\'s phonebook that translates human-readable domain names into IP addresses that computers use to communicate.',
    example: 'google.com → 142.250.185.46',
    icon: '🌐',
    relatedTerms: ['IP Address', 'Domain Name', 'Resolution']
  },
  {
    term: 'DNSSEC',
    category: 'Security',
    definition: 'DNS Security Extensions that add cryptographic signatures to DNS records to verify authenticity and prevent spoofing.',
    example: 'Chain of trust: Root DNSKEY → TLD DS → Domain RRSIG',
    icon: '🔒',
    relatedTerms: ['RRSIG', 'DNSKEY', 'DS Record', 'DNS Spoofing']
  },
  {
    term: 'DNSKEY',
    category: 'DNSSEC',
    definition: 'A public key used in DNSSEC to verify digital signatures on DNS records.',
    example: 'Root zone DNSKEY is the trust anchor for DNSSEC',
    icon: '🔑',
    relatedTerms: ['DNSSEC', 'RRSIG', 'DS Record']
  },
  {
    term: 'Domain Name',
    category: 'Fundamentals',
    definition: 'A human-readable address for a website or service on the internet, organized hierarchically.',
    example: 'www.example.com (subdomain.domain.TLD)',
    icon: '🏷️',
    relatedTerms: ['TLD', 'Subdomain', 'FQDN']
  },
  {
    term: 'DS Record',
    category: 'DNSSEC',
    definition: 'Delegation Signer record that points to a DNSKEY in a child zone, establishing the DNSSEC chain of trust.',
    example: 'Root DS for .com → Points to .com TLD DNSKEY',
    icon: '🔐',
    relatedTerms: ['DNSSEC', 'DNSKEY', 'Chain of Trust']
  },
  {
    term: 'FQDN (Fully Qualified Domain Name)',
    category: 'Fundamentals',
    definition: 'A complete domain name that specifies the exact location in the DNS hierarchy, including all labels down to the root.',
    example: 'www.example.com. (note the trailing dot)',
    icon: '🎯',
    relatedTerms: ['Domain Name', 'Root Zone', 'DNS Hierarchy']
  },
  {
    term: 'IP Address',
    category: 'Fundamentals',
    definition: 'A numerical label assigned to each device on a network. IPv4 uses 32 bits, IPv6 uses 128 bits.',
    example: 'IPv4: 192.168.1.1, IPv6: 2001:0db8::1',
    icon: '📍',
    relatedTerms: ['A Record', 'AAAA Record', 'DNS Resolution']
  },
  {
    term: 'Iterative Resolution',
    category: 'Resolution Modes',
    definition: 'A DNS resolution method where the client queries each DNS server directly, following referrals from root to authoritative server.',
    example: 'Client → Root → Client → TLD → Client → Authoritative',
    icon: '🔁',
    relatedTerms: ['Recursive Resolution', 'DNS Query', 'Referral']
  },
  {
    term: 'Latency',
    category: 'Performance',
    definition: 'The time delay between sending a DNS query and receiving a response. Measured in milliseconds (ms).',
    example: 'Local cache: <10ms, Full resolution: 50-200ms',
    icon: '⏱️',
    relatedTerms: ['Performance', 'Network Delay', 'RTT']
  },
  {
    term: 'MX Record',
    category: 'Record Types',
    definition: 'Mail Exchange record that specifies the mail server responsible for accepting email for a domain.',
    example: '10 mail.example.com (priority 10)',
    icon: '📧',
    relatedTerms: ['Email', 'Priority', 'Mail Server']
  },
  {
    term: 'Nameserver',
    category: 'DNS Infrastructure',
    definition: 'A server that stores DNS records and answers queries about domains. Can be authoritative or recursive.',
    example: 'ns1.google.com, 8.8.8.8 (Google Public DNS)',
    icon: '🖥️',
    relatedTerms: ['NS Record', 'Authoritative Server', 'Recursive Resolver']
  },
  {
    term: 'NS Record',
    category: 'Record Types',
    definition: 'Nameserver record that delegates a DNS zone to a specific authoritative nameserver.',
    example: 'example.com → ns1.example.com',
    icon: '🏢',
    relatedTerms: ['Nameserver', 'Delegation', 'Zone']
  },
  {
    term: 'Packet Loss',
    category: 'Network Issues',
    definition: 'When network packets fail to reach their destination. DNS uses retry mechanisms with exponential backoff to handle this.',
    example: 'Packet lost at 45% → Retry attempt 1 → Success',
    icon: '⚠️',
    relatedTerms: ['Network Reliability', 'Retry Logic', 'Timeout']
  },
  {
    term: 'PTR Record',
    category: 'Record Types',
    definition: 'Pointer record used for reverse DNS lookups, mapping IP addresses back to domain names.',
    example: '1.1.168.192.in-addr.arpa → router.example.com',
    icon: '↩️',
    relatedTerms: ['Reverse DNS', 'A Record', 'IP Address']
  },
  {
    term: 'Recursive Resolver',
    category: 'DNS Infrastructure',
    definition: 'A DNS server that performs the complete resolution process on behalf of clients, querying multiple servers if needed.',
    example: 'Google DNS (8.8.8.8), Cloudflare DNS (1.1.1.1)',
    icon: '🔄',
    relatedTerms: ['Recursive Resolution', 'Cache', 'Forwarding']
  },
  {
    term: 'Recursive Resolution',
    category: 'Resolution Modes',
    definition: 'A DNS resolution method where the recursive resolver handles all queries, returning the final answer to the client.',
    example: 'Client → Recursive Resolver → (Root, TLD, Auth) → Client',
    icon: '🔄',
    relatedTerms: ['Iterative Resolution', 'Recursive Resolver', 'DNS Query']
  },
  {
    term: 'Referral',
    category: 'DNS Behavior',
    definition: 'When a DNS server responds with a reference to another nameserver rather than a final answer.',
    example: 'Root server refers to .com TLD server',
    icon: '➡️',
    relatedTerms: ['Iterative Resolution', 'Delegation', 'NS Record']
  },
  {
    term: 'Root Server',
    category: 'DNS Infrastructure',
    definition: 'The top-level DNS servers in the hierarchy. There are 13 root server clusters (A-M) distributed globally.',
    example: 'a.root-servers.net (198.41.0.4)',
    icon: '🌍',
    relatedTerms: ['DNS Hierarchy', 'TLD', 'Anycast']
  },
  {
    term: 'RRSIG',
    category: 'DNSSEC',
    definition: 'Resource Record Signature containing the cryptographic signature for a DNS record set in DNSSEC.',
    example: 'RRSIG for A record, signed by zone\'s private key',
    icon: '✍️',
    relatedTerms: ['DNSSEC', 'DNSKEY', 'Digital Signature']
  },
  {
    term: 'SOA Record',
    category: 'Record Types',
    definition: 'Start of Authority record containing metadata about a DNS zone, including the primary nameserver and zone serial number.',
    example: 'Primary NS: ns1.example.com, Serial: 2025111101',
    icon: '👑',
    relatedTerms: ['Zone File', 'Nameserver', 'Zone Transfer']
  },
  {
    term: 'TLD (Top-Level Domain)',
    category: 'DNS Hierarchy',
    definition: 'The highest level in the DNS hierarchy below the root, such as .com, .org, .net, or country codes like .uk.',
    example: '.com (generic TLD), .uk (country-code TLD)',
    icon: '🏢',
    relatedTerms: ['Domain Name', 'Root Server', 'gTLD', 'ccTLD']
  },
  {
    term: 'TTL (Time To Live)',
    category: 'Caching',
    definition: 'The duration (in seconds) that a DNS record should be cached before being refreshed from the authoritative server.',
    example: 'TTL: 300 seconds (5 minutes)',
    icon: '⏲️',
    relatedTerms: ['Cache', 'Expiration', 'Performance']
  },
  {
    term: 'TXT Record',
    category: 'Record Types',
    definition: 'Text record that stores arbitrary text data, commonly used for email security (SPF, DKIM) and domain verification.',
    example: 'v=spf1 include:_spf.google.com ~all',
    icon: '📄',
    relatedTerms: ['SPF', 'DKIM', 'Domain Verification']
  },
  {
    term: 'Zone',
    category: 'DNS Infrastructure',
    definition: 'A portion of the DNS namespace managed by a specific organization or administrator.',
    example: 'The example.com zone includes all subdomains',
    icon: '🗂️',
    relatedTerms: ['Zone File', 'Delegation', 'Authoritative Server']
  },
  {
    term: 'Zone File',
    category: 'DNS Infrastructure',
    definition: 'A text file containing DNS records for a zone, stored on authoritative nameservers.',
    example: 'Contains A, AAAA, MX, TXT records for a domain',
    icon: '📝',
    relatedTerms: ['Zone', 'DNS Records', 'SOA Record']
  }
];

const CATEGORIES = [
  'All',
  'Fundamentals',
  'Record Types',
  'DNS Infrastructure',
  'Resolution Modes',
  'Security',
  'DNSSEC',
  'Performance',
  'Caching',
  'Network Issues',
  'DNS Hierarchy',
  'DNS Behavior'
];

function DNSGlossary({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState(null);

  const filteredTerms = useMemo(() => {
    return DNS_TERMS.filter(term => {
      const matchesSearch = 
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.example.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === 'All' || term.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  const handleTermClick = (term) => {
    setSelectedTerm(term);
  };

  const handleRelatedTermClick = (relatedTerm) => {
    const term = DNS_TERMS.find(t => t.term === relatedTerm);
    if (term) {
      setSelectedTerm(term);
      setSearchQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="glossary-overlay" onClick={onClose}>
      <div className="glossary-panel" onClick={(e) => e.stopPropagation()}>
        <div className="glossary-header">
          <div className="glossary-title">
            <span className="glossary-icon">📚</span>
            <h2>DNS Glossary</h2>
          </div>
          <button className="glossary-close" onClick={onClose}>✕</button>
        </div>

        <div className="glossary-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search DNS terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className="glossary-categories">
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="glossary-content">
          <div className="terms-list">
            {filteredTerms.length === 0 ? (
              <div className="no-results">
                <span className="no-results-icon">🔍</span>
                <p>No terms found matching "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')} className="reset-search">
                  Clear search
                </button>
              </div>
            ) : (
              filteredTerms.map((term, index) => (
                <div
                  key={index}
                  className={`term-card ${selectedTerm?.term === term.term ? 'selected' : ''}`}
                  onClick={() => handleTermClick(term)}
                >
                  <div className="term-header">
                    <span className="term-icon">{term.icon}</span>
                    <div className="term-info">
                      <h3>{term.term}</h3>
                      <span className="term-category">{term.category}</span>
                    </div>
                  </div>
                  <p className="term-definition">{term.definition}</p>
                </div>
              ))
            )}
          </div>

          {selectedTerm && (
            <div className="term-details">
              <div className="detail-header">
                <div className="detail-title">
                  <span className="detail-icon">{selectedTerm.icon}</span>
                  <h3>{selectedTerm.term}</h3>
                </div>
                <button className="close-detail" onClick={() => setSelectedTerm(null)}>
                  ✕
                </button>
              </div>

              <div className="detail-category">
                <span className="label">Category:</span>
                <span className="value">{selectedTerm.category}</span>
              </div>

              <div className="detail-section">
                <h4>📖 Definition</h4>
                <p>{selectedTerm.definition}</p>
              </div>

              <div className="detail-section">
                <h4>💡 Example</h4>
                <div className="example-box">
                  <code>{selectedTerm.example}</code>
                </div>
              </div>

              {selectedTerm.relatedTerms && selectedTerm.relatedTerms.length > 0 && (
                <div className="detail-section">
                  <h4>🔗 Related Terms</h4>
                  <div className="related-terms">
                    {selectedTerm.relatedTerms.map((relatedTerm, idx) => (
                      <button
                        key={idx}
                        className="related-term-btn"
                        onClick={() => handleRelatedTermClick(relatedTerm)}
                      >
                        {relatedTerm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="quick-actions">
                <button 
                  className="action-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTerm.definition);
                    alert('Definition copied to clipboard!');
                  }}
                >
                  📋 Copy Definition
                </button>
                <button 
                  className="action-btn"
                  onClick={() => {
                    const query = encodeURIComponent(`DNS ${selectedTerm.term}`);
                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                  }}
                >
                  🔍 Search Online
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glossary-footer">
          <p>
            <strong>{filteredTerms.length}</strong> term{filteredTerms.length !== 1 ? 's' : ''} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DNSGlossary;
