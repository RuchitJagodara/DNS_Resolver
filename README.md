# DNS Resolution Simulator 🌐🎓

Enhance your understanding of DNS (Domain Name System) resolution with this interactive, web-based visualization tool!

## 🌐 Overview

The **DNS Resolution Simulator** is an educational application designed to make complex DNS concepts accessible through interactive visualizations and real-time analysis. Built using React, D3.js, and Node.js, it provides hands-on learning through:

- **Deterministic Simulation Mode** – Step-by-step conceptual DNS resolution
- **Live Mode (Real DNS Trace)** – Actual DNS queries using `dig +trace`
- **Security Protocol Education** – DoH, DoT, and DNSSEC visualizations
- **Attack Scenario Demonstrations** – Interactive attack simulations
- **Comprehensive Learning Resources** – Tutorials and DNS glossary

With animated visualizations, step-by-step timelines, and customizable parameters, this tool is perfect for students and enthusiasts who want hands-on DNS learning.

## 🎨 Features

### 🔍 Deterministic Simulation Mode
Conceptual clarity through guided DNS resolution!

- **What You Get**: Step-by-step resolution flow (Client → Resolver → Root → TLD → Authoritative)
- **Interactive Learning**: Visualize caching behavior and DNS hierarchy
- **Structured Results**: Detailed timeline with role-based server identification
- **Educational Focus**: Perfect for understanding DNS concepts without network complexity

### 🌍 Live Mode (Real DNS Trace)
Hands-on realism with actual DNS queries!

- **What You Get**: Parses real `dig +trace` output, renders stage-by-stage progress
- **Real-World Data**: Shows actual DNS servers, timings, and DNSSEC records
- **Error Handling**: Displays failures, retries, and timeout scenarios
- **Requirements**: Internet connectivity; integrated into same timeline/visualization

### 🔐 Security Protocols Visualization
Conceptual understanding of DNS security!

- **DoH (DNS over HTTPS)**: Animated walkthrough of encrypted DNS via HTTPS
- **DoT (DNS over TLS)**: Visualize TLS-encrypted DNS communication
- **DNSSEC**: Chain-of-trust visualization with DS/RRSIG indicators and validation steps
- **Educational Mode**: Focused on teaching concepts rather than cryptographic implementation

### ⚠️ Attack Scenarios
Advanced learning through security demonstrations!

- **Cache Poisoning**: Including Kaminsky race condition visualization
- **NXDOMAIN Abuse**: Understand domain flooding attacks
- **MITM Flows**: Visualize man-in-the-middle attack scenarios
- **Educational Mode**: Step-by-step breakdowns (intercept, duplicate, modify, race)
- **Color-Coded Paths**: Distinguish legitimate vs. attack traffic

### 📊 Visualization and Timeline
Step-level insights with beautiful animations!

- **Animated Node Graph**: D3.js-powered visualization of DNS resolution flow
- **Ordered Timeline**: Chronological view of each resolution step
- **Status Badges**: Visual indicators for attempts, failures, and DNSSEC validation
- **Color Coding**: Blue (querying), Green (success), Red (error), Orange (cache), Purple (DNSSEC)
- **Tooltips & Summaries**: Hover for detailed information at each step

### 📚 Tutorial and Glossary
Fast onboarding for all skill levels!

- **First-Run Wizard**: Interactive tutorial for new users
- **DNS Glossary**: Comprehensive definitions of DNS terminology
- **Learning Levels**:
  - **Basic**: Tutorial, Glossary, Visualization timeline
  - **Intermediate**: Deterministic Simulation, DNSSEC chain cues
  - **Advanced**: Live Mode analysis, Attack scenarios

## 📚 Project Objectives

### Key Goals

- **Visual Learning**: Provide students with graphical simulations to reinforce DNS theory
- **Hands-On Interaction**: Allow users to experiment with different domains and query types
- **Comprehensive Coverage**: Cover essential DNS topics with clarity and interactivity
- **Real-World Integration**: Bridge theory with actual DNS infrastructure using `dig +trace`
- **Security Awareness**: Educate on DNS security protocols and vulnerabilities




## 🛠️ Tech Stack

### Frontend
- **React 18** – Modern UI library
- **Vite** – Fast build tool and dev server
- **D3.js** – Powerful data visualization library
- **CSS Modules** – Scoped styling

### Backend
- **Node.js** – JavaScript runtime
- **Express.js 4.18.2** – Web framework
- **dns-packet 5.6.1** – DNS packet parsing
- **node-cache 5.1.2** – In-memory caching
- **CORS 2.8.5** – Cross-origin resource sharing

### Tools & Infrastructure
- **Docker & Docker Compose** – Containerized deployment
- **dig +trace** – Real DNS resolution tool
- **Git** – Version control

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js**: Version 16.x or higher
- **npm** or **yarn**: Package manager
- **Docker & Docker Compose**: For containerized deployment
- **Git**: For cloning the repository
- **Internet Connection**: Required for Live Mode

### Clone the Repository

```bash
git clone https://github.com/yourusername/dns-resolution-simulator.git
cd dns-resolution-simulator
```

## 💻 Installation & Setup

### Option 1: Using Docker (Recommended)

#### Step 1: Build and Start Containers

```bash
# Build and start both frontend and backend
docker-compose up --build
```

#### Step 2: Access the Application

- **Frontend**: Open your browser at `http://localhost:3000`
- **Backend API**: Available at `http://localhost:5001`

#### Stop the Application

```bash
docker-compose down
```

### Option 2: Manual Setup

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the backend server
npm start
```

The backend will run on `http://localhost:5001`

#### Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📖 Usage Guide

### Basic Usage

1. **Select Query Mode**
   - Choose between **Deterministic** (simulation) or **Live** (real DNS) mode

2. **Enter Domain**
   - Type a domain name (e.g., `google.com`, `example.com`)

3. **Select Record Type**
   - Choose DNS record type: A, AAAA, MX, NS, TXT, etc.

4. **Configure Options** (Optional)
   - Enable/disable DNSSEC
   - Set timeout values
   - Configure cache behavior

5. **Execute Query**
   - Click "Resolve" to start the DNS resolution
   - Watch the animated visualization unfold

6. **Explore Results**
   - View the timeline of DNS queries
   - Examine server responses
   - Analyze DNSSEC validation (if enabled)

### Deterministic Mode

```
Purpose: Educational simulation without real network queries
Perfect for: Learning DNS hierarchy and resolution steps
Features: 
  ✓ Configurable latency simulation
  ✓ Cache behavior demonstration
  ✓ DNSSEC conceptual flags
  ✓ Error scenario simulation
```

### Live Mode

```
Purpose: Real-world DNS resolution using dig +trace
Perfect for: Understanding actual DNS infrastructure
Features:
  ✓ Queries real root, TLD, and authoritative servers
  ✓ Shows actual IP addresses and timings
  ✓ Displays DNSSEC records from live servers
  ✓ Handles network errors and timeouts
```

### Security Protocols Panel

Navigate to the Security section to explore:

- **DoH (DNS over HTTPS)**: Learn how DNS queries are encrypted via HTTPS
- **DoT (DNS over TLS)**: Understand TLS-based DNS encryption
- **DNSSEC**: Explore cryptographic validation and chain of trust

### Attack Scenarios Panel

Explore educational attack demonstrations:

- **Cache Poisoning**: Understand how attackers can corrupt DNS caches
- **Kaminsky Attack**: Learn about the famous DNS vulnerability
- **NXDOMAIN Flood**: See how domain flooding works
- **MITM (Man-in-the-Middle)**: Visualize DNS interception attacks

Each scenario includes:
- Step-by-step animation
- Attack explanation
- Mitigation strategies


## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│                    (http://localhost:3000)                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Vite Dev Server                            │
│                   (Frontend Host)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React Application                       │    │
│  │  - QueryInput.jsx                                   │    │
│  │  - VisualizationPanel.jsx (D3.js)                  │    │
│  │  - ResultsPanel.jsx                                 │    │
│  │  - SecurityProtocolsPanel.jsx                       │    │
│  │  - AttackScenariosPanel.jsx                        │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │ API Proxy
                            │ POST /api/resolve
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Express.js Backend Server                        │
│                (http://backend:5001)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           API Routes                                 │    │
│  │  - POST /api/resolve                                │    │
│  │  - POST /api/simulate-attack                        │    │
│  │  - POST /api/simulate-security                      │    │
│  │  - GET /health                                      │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────┐    │
│  │        Resolver Logic                                │    │
│  │  ┌─────────────────┐    ┌──────────────────┐       │    │
│  │  │  Deterministic  │    │   Live DNS       │       │    │
│  │  │   Simulator     │    │   Tracer         │       │    │
│  │  │ (dnsResolver.js)│    │(liveDNSTracer.js)│       │    │
│  │  └─────────────────┘    └────────┬─────────┘       │    │
│  └────────────────────────────────────┼──────────────────┘    │
└────────────────────────────────────────┼──────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │   dig +trace        │
                            │  (System Command)   │
                            └──────────┬──────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
            │ Root Servers │    │ TLD Servers  │   │ Authoritative│
            │   (a-m.root) │    │  (.com, .in) │   │   Servers    │
            └──────────────┘    └──────────────┘   └──────────────┘
```

### Request Flow Diagram

```
1. User enters domain → React QueryInput
                ↓
2. POST /api/resolve {domain, type, mode}
                ↓
3. Vite proxy forwards to Express backend
                ↓
4. Backend routes based on mode
                ↓
        ┌───────┴────────┐
        ▼                ▼
  Deterministic     Live Mode
    Simulator       (dig +trace)
        │                │
        └───────┬────────┘
                ↓
5. Normalized JSON response {steps[], finalAnswer, metrics}
                ↓
6. Frontend updates visualization (D3.js) and timeline
```

### Component Architecture

#### Backend Modules (`backend/src/`)

- **server.js** – Express server with API endpoints
- **dnsResolver.js** – Deterministic simulation engine
- **liveDNSTracer.js** – dig +trace executor and parser
- **domainParser.js** – Domain validation and parsing
- **securitySimulator.js** – DoH/DoT/DNSSEC simulation
- **attackSimulator.js** – Attack scenario generator
- **liveDNSResolver.js** – Node.js dns.resolve() wrapper
- **realDNSQuery.js** – Quick lookup utility

#### Frontend Components (`frontend/src/components/`)

- **App.jsx** – Root component with state management
- **QueryInput.jsx** – Domain input and configuration
- **VisualizationPanel.jsx** – D3.js animated graph
- **DynamicVisualization.jsx** – Real-time updates for live mode
- **ResultsPanel.jsx** – Query results and metrics
- **ResolutionMatrix.jsx** – Tabular trace view
- **ConfigPanel.jsx** – Settings and options
- **SecurityProtocolsPanel.jsx** – Security education content
- **DNSSECChainVisualization.jsx** – Chain of trust visual
- **AttackScenariosPanel.jsx** – Attack demonstrations
- **TutorialWizard.jsx** – Onboarding wizard
- **DNSGlossary.jsx** – Terminology reference
- **ErrorBoundary.jsx** – Error handling wrapper

## 🔧 Implementation Details

### Live Mode: dig +trace Implementation


**Selected: dig +trace**

**Advantages:**
- ✓ Fully automatic iterative resolution
- ✓ Accurate real-world behavior
- ✓ Handles DNSSEC, EDNS(0), TCP fallback
- ✓ Widely available and reliable
- ✓ Shows delegation hierarchy

**Trade-off:** Text-based output requires parsing (vs. JSON), but authenticity outweighs complexity.

#### How It Works

1. **Execute Command**: Spawn `dig +trace domain` as child process
2. **State-Machine Parser**: Parse semi-structured text output
3. **Zone Segmentation**: Separate root, TLD, and authoritative responses
4. **Data Extraction**: Extract servers, IPs, timings, DNSSEC records
5. **Timeout Handling**: 30-second timeout with graceful partial results
6. **Normalization**: Convert to unified JSON format for frontend

### Deterministic Mode Implementation

#### Simulation Engine Features

- **No Network Access**: Pure in-memory simulation
- **Educational Steps**: Generate role-labeled resolution path
- **Configurable Parameters**:
  - Network latency simulation
  - Packet loss scenarios (pseudo-random)
  - DNSSEC validation flags
  - Failure injection (timeout, NXDOMAIN, SERVFAIL)
- **Cache Simulation**: LRU cache with TTL using node-cache

#### Step Generation

```javascript
// Conceptual flow
Client → Recursive Resolver (cache check)
       → Root Server (. zone)
       → TLD Server (.com zone)
       → Authoritative Server (example.com zone)
       → Final Answer (A record: 93.184.216.34)
```

### Security Protocol Simulations

#### DNSSEC Visualization

- Shows chain of trust: Root → TLD → Domain
- Visual indicators for DS (Delegation Signer) records
- RRSIG (Resource Record Signature) presence
- Validation step animations
- Educational focus (not cryptographic verification)

#### DoH/DoT Visualization

- Conceptual walkthrough of encrypted transport
- Shows client → encrypted endpoint → upstream resolver
- Explains privacy benefits
- Demonstrates HTTPS (port 443) vs TLS (port 853)

### Attack Scenario Simulations

#### Implemented Attacks

1. **Cache Poisoning**
   - Traditional cache poisoning flow
   - Kaminsky attack variant with race condition
   - Visual race between legitimate and spoofed responses

2. **NXDOMAIN Flood**
   - Shows overwhelm of resolver with non-existent domains
   - Demonstrates resource exhaustion

3. **MITM (Man-in-the-Middle)**
   - Intercept → Copy → Modify → Forward flow
   - Color-coded attack vs. legitimate paths

4. **DNS Amplification**
   - Shows small query → large response exploitation
   - DDoS attack vector visualization

Each attack includes:
- Step-by-step animation
- Attack description
- Mitigation strategies
- Educational commentary


## 📁 Project Structure

```
yoproject/
│
├── README.md                     # This file
├── docker-compose.yml            # Docker orchestration
├── project_report_final.tex      # LaTeX project report
│
├── backend/                      # Node.js/Express backend
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── src/
│       ├── server.js             # Express server & API routes
│       ├── dnsResolver.js        # Deterministic simulator
│       ├── liveDNSTracer.js      # dig +trace executor & parser
│       ├── liveDNSResolver.js    # Node.js dns.resolve() wrapper
│       ├── domainParser.js       # Domain validation & parsing
│       ├── securitySimulator.js  # DoH/DoT/DNSSEC simulation
│       ├── attackSimulator.js    # Attack scenario generator
│       └── realDNSQuery.js       # Quick lookup utility
│
└── frontend/                     # React/Vite frontend
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js            # Vite configuration
    ├── index.html
    ├── Dockerfile
    └── src/
        ├── main.jsx              # React entry point
        ├── App.css
        └── components/
            ├── App.jsx                      # Root component
            ├── QueryInput.jsx               # Domain input form
            ├── VisualizationPanel.jsx       # D3.js graph
            ├── DynamicVisualization.jsx     # Live updates
            ├── ResultsPanel.jsx             # Query results
            ├── ResolutionMatrix.jsx         # Tabular view
            ├── ConfigPanel.jsx              # Settings
            ├── SecurityProtocolsPanel.jsx   # Security education
            ├── DNSSECChainVisualization.jsx # DNSSEC chain
            ├── AttackScenariosPanel.jsx     # Attack demos
            ├── TutorialWizard.jsx           # Onboarding
            ├── DNSGlossary.jsx              # Terminology
            └── ErrorBoundary.jsx            # Error handling
```
## 📄 License

This project is developed for educational purposes as part of the Computer Networks course.

**Authors:**
- Chirag Patel (22110183)
- Ruchit Jagodara (22110102)


- **References:**
  - Mockapetris, P. (1987). RFC 1034 & 1035: Domain Names
  - Arends, R., et al. (2005). RFC 4033-4035: DNSSEC
  - Kurose & Ross. Computer Networking (8th ed.)
  - Liu & Albitz. DNS and BIND (O'Reilly)
