import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/DNSSECChain.css';

const LEVEL_ORDER = ['root', 'tld', 'authoritative', 'summary', 'unknown'];

const LEVEL_CONFIG = {
  root: { label: 'Root Zone', color: '#6366F1', icon: '🌍' },
  tld: { label: 'TLD Zone', color: '#E879F9', icon: '🏢' },
  authoritative: { label: 'Authoritative Zone', color: '#FB923C', icon: '📡' },
  summary: { label: 'Validation Summary', color: '#22C55E', icon: '✅' },
  unknown: { label: 'DNSSEC Step', color: '#38BDF8', icon: '❓' }
};

const STEP_DELAY = 520;

const getOrderIndex = (level) => {
  const idx = LEVEL_ORDER.indexOf(level);
  return idx === -1 ? LEVEL_ORDER.length + 1 : idx;
};

const buildLevelNodes = (steps = []) => {
  if (!steps || steps.length === 0) {
    return [];
  }

  const levelMap = new Map();

  steps.forEach((step, index) => {
    const level = step.dnssec?.level || 'unknown';
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.unknown;
    const validOverride = level === 'summary' && step.dnssec?.validated !== undefined;
    const currentValid = validOverride ? step.dnssec?.validated : step.dnssec?.valid;
    const isValid = currentValid === undefined ? true : currentValid !== false;

    if (!levelMap.has(level)) {
      levelMap.set(level, {
        id: level,
        level,
        firstIndex: index,
        steps: [step],
        lastStep: step,
        valid: isValid,
        label: config.label,
        color: config.color,
        icon: config.icon
      });
    } else {
      const entry = levelMap.get(level);
      entry.steps.push(step);
      entry.lastStep = step;
      if (entry.valid) {
        entry.valid = isValid;
      }
    }
  });

  return Array.from(levelMap.values())
    .sort((a, b) => {
      const orderDiff = getOrderIndex(a.level) - getOrderIndex(b.level);
      if (orderDiff !== 0) return orderDiff;
      return a.firstIndex - b.firstIndex;
    });
};

const buildTooltipMarkup = (node) => {
  const latestStep = node.lastStep || node.steps[node.steps.length - 1];
  const dnssec = latestStep?.dnssec || {};
  const explanation = latestStep?.explanation;

  const rows = [
    dnssec.recordType && { label: 'Record', value: dnssec.recordType },
    dnssec.algorithm && { label: 'Algorithm', value: dnssec.algorithm },
    dnssec.keyTag && { label: 'Key Tag', value: dnssec.keyTag },
    dnssec.digestType && { label: 'Digest', value: dnssec.digestType },
    dnssec.signatureExpiration && {
      label: 'Expires',
      value: new Date(dnssec.signatureExpiration).toLocaleString()
    }
  ].filter(Boolean);

  return `
    <div class="tooltip-title">${node.label}</div>
    <div class="tooltip-status ${node.valid ? 'valid' : 'invalid'}">${node.valid ? '✅ Chain intact' : '❌ Validation error'}</div>
    ${explanation ? `<p class="tooltip-copy">${explanation}</p>` : ''}
    ${rows.length ? `
      <div class="tooltip-list">
        ${rows.map(row => `
          <div class="tooltip-row">
            <span class="tooltip-label">${row.label}</span>
            <span class="tooltip-value">${row.value}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
};

function DNSSECChainVisualization({ dnssecSteps }) {
  const svgRef = useRef(null);
  const chartRef = useRef(null);
  const tooltipRef = useRef(null);

  const levelNodes = useMemo(() => buildLevelNodes(dnssecSteps), [dnssecSteps]);

  const summaryStep = useMemo(
    () => dnssecSteps?.find(step => step.dnssec?.securityScore !== undefined),
    [dnssecSteps]
  );

  const drawDNSSECChain = useCallback(() => {
    const svgElement = svgRef.current;
    const container = chartRef.current;

    if (!svgElement || !container) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (!levelNodes.length) {
      return;
    }

    const width = container.clientWidth || 720;
    const height = 360;
    const margin = { top: 30, right: 40, bottom: 40, left: 40 };
    const innerWidth = Math.max(240, width - margin.left - margin.right);
    const baselineY = height / 2;
    const nodeSpacing = levelNodes.length > 1 ? innerWidth / (levelNodes.length - 1) : 0;

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg.append('defs');

    const gradient = defs
      .append('linearGradient')
      .attr('id', 'dnssec-connector-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', innerWidth)
      .attr('y2', 0);

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#6366F1');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#22D3EE');

    const glow = defs
      .append('filter')
      .attr('id', 'dnssec-node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glow.append('feGaussianBlur').attr('stdDeviation', 8).attr('result', 'coloredBlur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const arrow = defs
      .append('marker')
      .attr('id', 'dnssec-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse');

    arrow.append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#CBD5F5');

    const g = svg.append('g').attr('transform', `translate(${margin.left}, 0)`);

    const positions = levelNodes.map((node, idx) => ({
      ...node,
      x: levelNodes.length > 1 ? idx * nodeSpacing : innerWidth / 2,
      y: baselineY
    }));

    g.append('line')
      .attr('class', 'dnssec-base-line')
      .attr('x1', positions.length > 1 ? 0 : positions[0].x - 120)
      .attr('x2', positions.length > 1 ? innerWidth : positions[0].x + 120)
      .attr('y1', baselineY)
      .attr('y2', baselineY);

    const connectorGroup = g.append('g').attr('class', 'dnssec-connectors');

    positions.forEach((node, idx) => {
      if (idx === 0) return;
      const previous = positions[idx - 1];
      const path = connectorGroup
        .append('path')
        .attr('class', 'dnssec-connector')
        .attr(
          'd',
          `M ${previous.x} ${baselineY} C ${previous.x + nodeSpacing / 2} ${baselineY - 90}, ${node.x - nodeSpacing / 2} ${baselineY + 90}, ${node.x} ${baselineY}`
        )
        .attr('stroke', node.valid && previous.valid ? 'url(#dnssec-connector-gradient)' : '#F87171')
        .attr('marker-end', 'url(#dnssec-arrow)')
        .attr('opacity', 0.15);

      const totalLength = path.node().getTotalLength();

      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .delay(Math.max(0, node.firstIndex * STEP_DELAY - 200))
        .duration(650)
        .attr('opacity', 0.85)
        .attr('stroke-dashoffset', 0);
    });

    const nodesGroup = g.append('g').attr('class', 'dnssec-nodes');
    const tooltip = tooltipRef.current ? d3.select(tooltipRef.current) : null;

    const nodeSelection = nodesGroup
      .selectAll('g')
      .data(positions, d => d.id)
      .enter()
      .append('g')
      .attr('class', d => `dnssec-node ${d.valid ? 'valid' : 'invalid'}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('opacity', 0);

    nodeSelection
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY)
      .duration(420)
      .style('opacity', 1);

    nodeSelection
      .append('circle')
      .attr('class', 'dnssec-node-ring')
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('opacity', 0.28)
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY)
      .duration(420)
      .attr('r', 58);

    nodeSelection
      .append('circle')
      .attr('class', 'dnssec-node-core')
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('stroke', d => (d.valid ? '#F8FAFC' : '#ef4444'))
      .attr('stroke-width', 4)
      .attr('filter', 'url(#dnssec-node-glow)')
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY)
      .duration(480)
      .ease(d3.easeBackOut)
      .attr('r', 46);

    nodeSelection
      .append('text')
      .attr('class', 'dnssec-node-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', 10)
      .style('opacity', 0)
      .text(d => d.icon)
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY + 180)
      .duration(320)
      .style('opacity', 1);

    nodeSelection
      .append('text')
      .attr('class', 'dnssec-node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', 70)
      .style('opacity', 0)
      .text(d => d.label)
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY + 220)
      .duration(320)
      .style('opacity', 1);

    nodeSelection
      .append('text')
      .attr('class', 'dnssec-node-status')
      .attr('text-anchor', 'middle')
      .attr('dy', 90)
      .style('opacity', 0)
      .text(d => (d.valid ? 'Chain verified' : 'Validation failed'))
      .transition()
      .delay(d => d.firstIndex * STEP_DELAY + 260)
      .duration(320)
      .style('opacity', 1);

    if (tooltip) {
      nodeSelection
        .on('mouseenter', (event, d) => {
          const [x, y] = d3.pointer(event, container);
          tooltip
            .style('opacity', 1)
            .style('left', `${x + 18}px`)
            .style('top', `${y - 26}px`)
            .html(buildTooltipMarkup(d));
        })
        .on('mousemove', (event) => {
          const [x, y] = d3.pointer(event, container);
          tooltip.style('left', `${x + 18}px`).style('top', `${y - 26}px`);
        })
        .on('mouseleave', () => {
          tooltip.style('opacity', 0);
        });
    }
  }, [levelNodes]);

  useEffect(() => {
    drawDNSSECChain();
  }, [drawDNSSECChain]);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const ResizeObserverConstructor =
      typeof window !== 'undefined' ? window.ResizeObserver : undefined;

    if (ResizeObserverConstructor) {
      const observer = new ResizeObserverConstructor(() => drawDNSSECChain());
      observer.observe(element);
      return () => observer.disconnect();
    }

    const handleResize = () => drawDNSSECChain();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawDNSSECChain]);

  if (!dnssecSteps || dnssecSteps.length === 0) {
    return null;
  }

  const securityScore = summaryStep?.dnssec?.securityScore ?? null;
  const securityMessage = summaryStep?.dnssec?.message;
  const summaryValidated = summaryStep?.dnssec?.validated;

  return (
    <div className="dnssec-chain-panel">
      <div className="dnssec-chain-header">
        <div className="dnssec-chain-title">
          <span className="dnssec-chain-icon">🔒</span>
          <div>
            <h3>DNSSEC Chain of Trust</h3>
            <p>Step-by-step validation of cryptographic signatures</p>
          </div>
        </div>
        <div className="dnssec-step-count">
          <span>{dnssecSteps.length}</span>
          <small>steps</small>
        </div>
      </div>

      <div className="dnssec-visualization" ref={chartRef}>
        <svg ref={svgRef} className="dnssec-svg" role="img" aria-label="DNSSEC chain visualization" />
        <div ref={tooltipRef} className="dnssec-tooltip" />
      </div>

      <div className="dnssec-step-timeline" aria-label="DNSSEC validation steps">
        {dnssecSteps.map((step, index) => {
          const invalid = step.dnssec?.valid === false;
          return (
            <div key={`${step.stage}-${index}`} className={`dnssec-step-card ${invalid ? 'invalid' : 'valid'}`}>
              <div className="dnssec-step-index">#{index + 1}</div>
              <div className="dnssec-step-body">
                <h4>{step.name}</h4>
                <p>{step.description || 'No additional context provided.'}</p>
                <div className="dnssec-step-meta">
                  {step.dnssec?.recordType && <span>{step.dnssec.recordType}</span>}
                  {step.dnssec?.algorithm && <span>{step.dnssec.algorithm}</span>}
                  {step.dnssec?.level && (
                    <span className="dnssec-step-level">{step.dnssec.level.toUpperCase()}</span>
                  )}
                </div>
                <div className={`dnssec-step-status ${invalid ? 'invalid' : 'valid'}`}>
                  {invalid ? '❌ Validation failed' : '✅ Verified'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dnssec-details">
        {dnssecSteps.map((step, index) => (
          step.dnssec && (
            <div
              key={`${step.stage}-${index}`}
              className={`dnssec-detail-card ${step.dnssec.valid === false ? 'invalid' : 'valid'}`}
            >
              <div className="dnssec-card-header">
                <span className="dnssec-icon">{step.dnssec.valid === false ? '❌' : '✅'}</span>
                <div>
                  <h4>{step.name}</h4>
                  {step.dnssec.level && (
                    <span className="dnssec-detail-level">{step.dnssec.level.toUpperCase()}</span>
                  )}
                </div>
                <span className="dnssec-step-chip">Step {index + 1}</span>
              </div>
              <div className="dnssec-card-body">
                <div className="dnssec-info-row">
                  <span className="label">Record Type</span>
                  <span className="value">{step.dnssec.recordType || '—'}</span>
                </div>
                {step.dnssec.keyTag && (
                  <div className="dnssec-info-row">
                    <span className="label">Key Tag</span>
                    <span className="value">{step.dnssec.keyTag}</span>
                  </div>
                )}
                {step.dnssec.algorithm && (
                  <div className="dnssec-info-row">
                    <span className="label">Algorithm</span>
                    <span className="value">{step.dnssec.algorithm}</span>
                  </div>
                )}
                {step.dnssec.signatureExpiration && (
                  <div className="dnssec-info-row">
                    <span className="label">Expires</span>
                    <span className="value">
                      {new Date(step.dnssec.signatureExpiration).toLocaleDateString()}
                      {step.dnssec.daysUntilExpiration
                        ? ` (${step.dnssec.daysUntilExpiration} days)`
                        : ''}
                    </span>
                  </div>
                )}
                {step.dnssec.error && (
                  <div className="dnssec-error">
                    <strong>Error</strong>
                    <span>{step.dnssec.error}</span>
                  </div>
                )}
              </div>
            </div>
          )
        ))}
      </div>

      
    </div>
  );
}

export default DNSSECChainVisualization;

