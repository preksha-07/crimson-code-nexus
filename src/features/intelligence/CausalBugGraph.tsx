import { useState } from 'react';
import type { CausalGraph, CausalGraphNode } from '../../types/intelligence';
import { Network } from 'lucide-react';

interface CausalBugGraphProps {
  graph: CausalGraph | null;
}

export default function CausalBugGraph({ graph }: CausalBugGraphProps) {
  const [selectedNode, setSelectedNode] = useState<CausalGraphNode | null>(null);

  if (!graph) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No causal graph structure mapped.
      </div>
    );
  }

  // Pre-defined node coordinates for the SVG visualization (hackathon/demo layout)
  // Input Node -> Middle Middleware Component -> Root Cause Component -> Service Component -> Release Impact Node
  const nodePositions: Record<string, { x: number; y: number; shape: string }> = {
    'input': { x: 60, y: 120, shape: 'circle' },
    'mid': { x: 220, y: 70, shape: 'rect' },
    'root': { x: 220, y: 200, shape: 'diamond' },
    'service': { x: 380, y: 120, shape: 'rect' },
    'release': { x: 540, y: 120, shape: 'double-circle' }
  };

  const handleNodeClick = (node: CausalGraphNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="nexus-card">
      <div className="card-header">
        <div className="card-title">
          <Network size={16} style={{ color: 'var(--color-cyan)' }} />
          Causal Relationship & Dependency Map
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: '1.4' }}>
        This graph traces failure propagation pathways. Click on any node element to view details.
      </p>

      {/* SVG Canvas */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-4)'
      }}>
        <svg width="600" height="260" style={{ maxWidth: '100%', overflow: 'visible' }}>
          {/* Arrow marker definitions */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-cyan)" />
            </marker>
          </defs>

          {/* Links rendering */}
          {graph.links.map((link, idx) => {
            const from = nodePositions[link.source];
            const to = nodePositions[link.target];
            if (!from || !to) return null;

            const isSelectedLink = selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);

            return (
              <g key={idx}>
                {/* Connection line */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isSelectedLink ? 'var(--color-cyan)' : 'var(--border-color)'}
                  strokeWidth={isSelectedLink ? 2 : 1.5}
                  markerEnd={`url(#${isSelectedLink ? 'arrow-active' : 'arrow'})`}
                  style={{ transition: 'all var(--transition-fast)' }}
                />
                
                {/* Optional link label */}
                {link.label && (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 8}
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                  >
                    {link.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes rendering */}
          {graph.nodes.map(node => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isSelected = selectedNode?.id === node.id;
            
            // Color based on node type
            let color = 'var(--text-secondary)';
            let fill = 'var(--bg-secondary)';
            let border = 'var(--border-color)';
            
            if (node.type === 'BUG') {
              color = 'var(--color-ruby)';
              fill = 'var(--bg-tertiary)';
              border = 'var(--color-ruby)';
            } else if (node.type === 'ROOT_CAUSE') {
              color = 'var(--color-amber)';
              fill = 'var(--bg-tertiary)';
              border = 'var(--color-amber)';
            } else if (node.type === 'RELEASE_IMPACT') {
              color = 'var(--color-cyan)';
              fill = 'var(--bg-tertiary)';
              border = 'var(--color-cyan)';
            } else if (node.type === 'COMPONENT') {
              color = 'var(--color-indigo)';
              fill = 'var(--bg-secondary)';
              border = 'var(--border-color)';
            }

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Shape */}
                {pos.shape === 'circle' && (
                  <circle
                    r="20"
                    fill={fill}
                    stroke={isSelected ? 'var(--color-cyan)' : border}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ transition: 'all var(--transition-fast)' }}
                  />
                )}
                {pos.shape === 'rect' && (
                  <rect
                    x="-32"
                    y="-15"
                    width="64"
                    height="30"
                    rx="4"
                    fill={fill}
                    stroke={isSelected ? 'var(--color-cyan)' : border}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ transition: 'all var(--transition-fast)' }}
                  />
                )}
                {pos.shape === 'diamond' && (
                  <polygon
                    points="0,-22 22,0 0,22 -22,0"
                    fill={fill}
                    stroke={isSelected ? 'var(--color-cyan)' : border}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ transition: 'all var(--transition-fast)' }}
                  />
                )}
                {pos.shape === 'double-circle' && (
                  <g>
                    <circle
                      r="20"
                      fill={fill}
                      stroke={border}
                      strokeWidth="2"
                    />
                    <circle
                      r="16"
                      fill="transparent"
                      stroke={isSelected ? 'var(--color-cyan)' : border}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                  </g>
                )}

                {/* Node symbol/initial inside */}
                <text
                  y="4"
                  fill={color}
                  fontWeight="bold"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {node.type === 'BUG' && 'BUG'}
                  {node.type === 'ROOT_CAUSE' && 'ROOT'}
                  {node.type === 'RELEASE_IMPACT' && 'RISK'}
                  {node.type === 'COMPONENT' && 'COMP'}
                </text>

                {/* External Node label text */}
                <text
                  y={pos.shape === 'rect' ? '30' : '34'}
                  fill="var(--text-primary)"
                  fontSize="9.5"
                  fontFamily="var(--font-sans)"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details */}
      <div style={{
        marginTop: 'var(--space-3)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        minHeight: '64px',
        fontSize: '12px'
      }}>
        {selectedNode ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedNode.label}</strong>
              <span className="badge badge-slate" style={{ fontSize: '9px' }}>Type: {selectedNode.type}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              {selectedNode.description || (
                selectedNode.type === 'BUG' ? 'Vulnerability trigger event containing input payload.' :
                selectedNode.type === 'ROOT_CAUSE' ? 'The underlying issue or root cause component.' :
                selectedNode.type === 'RELEASE_IMPACT' ? 'Impact on target release configurations.' :
                'Software service container context.'
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '10px' }}>
            Click on nodes in the map above to audit their dependency description.
          </div>
        )}
      </div>

      {/* Legend Block */}
      <div style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--color-ruby)' }} />
          <span>Vulnerability Trigger (Circle)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', borderRadius: '2px' }} />
          <span>Software Module (Rect)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', transform: 'rotate(45deg)', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--color-amber)', display: 'inline-block' }} />
          <span>Root Cause (Diamond)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px double var(--color-cyan)', display: 'inline-block', backgroundColor: 'var(--bg-tertiary)' }} />
          <span>Release Risk (Double Circle)</span>
        </div>
      </div>
    </div>
  );
}
