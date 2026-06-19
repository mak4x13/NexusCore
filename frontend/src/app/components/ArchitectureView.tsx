import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, Bot, GitBranch, Shield, FileCheck, AlertCircle, 
  ArrowRight, Info, CheckCircle2, ChevronRight, Terminal, Database, Cpu
} from 'lucide-react';

interface Node {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  labelX?: number;
  labelY?: number;
  icon: typeof Bot;
  color: string;
  details: {
    inputs: string[];
    outputs: string[];
    schema: string;
  };
}

interface Connection {
  from: string;
  to: string;
  label: string;
  path: string;
}

const nodes: Node[] = [
  {
    id: 'master',
    name: 'Master Agent',
    role: 'Final ALLOW/BLOCK Authority',
    x: 80,
    y: 250,
    labelY: 56,
    icon: Bot,
    color: '#000000',
    details: {
      inputs: ['Reviewer Findings', 'Risk Tier', 'Human Confirmation State'],
      outputs: ['DECISION: ALLOW', 'DECISION: BLOCK', 'Audit Ledger Entry'],
      schema: `{\n  "event": "master_decision",\n  "action_id": "act-9402",\n  "risk_tier": "CRITICAL",\n  "human_confirmed": true,\n  "decision": "ALLOW"\n}`
    }
  },
  {
    id: 'engineer',
    name: 'Engineer/Builder Agent',
    role: 'Code Plan & Patch Generation',
    x: 250,
    y: 65,
    labelY: 58,
    icon: Terminal,
    color: '#000000',
    details: {
      inputs: ['User Task', 'Repository Context', 'Approved Scope'],
      outputs: ['Code Plan', 'Patch Summary', 'Proposed Command'],
      schema: `{\n  "agent": "engineer_agent",\n  "task": "draft implementation plan",\n  "risky_action": false,\n  "next": "proposer_agent"\n}`
    }
  },
  {
    id: 'proposer',
    name: 'Proposer Agent',
    role: 'Dangerous Action Proposal',
    x: 250,
    y: 250,
    labelY: 58,
    icon: Bot,
    color: '#000000',
    details: {
      inputs: ['Engineer Plan', 'Command Text', 'Runtime Action'],
      outputs: ['Formal PROPOSAL', 'Reviewer Mentions', 'Band Room Trigger'],
      schema: `{\n  "agent": "proposer_agent",\n  "proposal": "DROP TABLE payment_transactions",\n  "mentions": ["risk", "compliance", "security", "test", "infrastructure", "rollback_audit", "master"]\n}`
    }
  },
  {
    id: 'risk',
    name: 'Risk Agent',
    role: 'Risk Assessment & Danger Detection',
    x: 430,
    y: 65,
    labelY: 58,
    icon: Shield,
    color: '#000000',
    details: {
      inputs: ['Formal PROPOSAL', 'Environment', 'Estimated Impact'],
      outputs: ['Risk Tier', 'Blast Radius', 'ALLOW/BLOCK Recommendation'],
      schema: `{\n  "agent": "risk_agent",\n  "risk_tier": "CRITICAL",\n  "reversible": false,\n  "recommendation": "BLOCK"\n}`
    }
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    role: 'Governance & Spec Enforcer',
    x: 430,
    y: 160,
    labelY: 64,
    icon: FileCheck,
    color: '#000000',
    details: {
      inputs: ['Formal PROPOSAL', 'Policy Rules', 'Approved Spec'],
      outputs: ['Policy PASS/WARN/FAIL', 'Approval Requirement', 'Compliance Notes'],
      schema: `{\n  "agent": "compliance_agent",\n  "policy_check": "FAIL",\n  "requires_human_approval": true,\n  "reason": "critical production data action"\n}`
    }
  },
  {
    id: 'security',
    name: 'Security Agent',
    role: 'Security Impact Review',
    x: 430,
    y: 260,
    labelY: 64,
    icon: AlertCircle,
    color: '#000000',
    details: {
      inputs: ['Formal PROPOSAL', 'Auth Context', 'Secrets/Endpoint Scope'],
      outputs: ['Security PASS/WARN/FAIL', 'Auth Findings', 'Vulnerability Notes'],
      schema: `{\n  "agent": "security_agent",\n  "finding": "FAIL",\n  "secret_exposure": false,\n  "approval_chain": "missing"\n}`
    }
  },
  {
    id: 'test',
    name: 'Test Agent',
    role: 'Test Readiness Review',
    x: 430,
    y: 360,
    labelY: 64,
    icon: Cpu,
    color: '#000000',
    details: {
      inputs: ['Code Plan', 'Change Type', 'Runtime Action'],
      outputs: ['Test Coverage Status', 'Smoke Test Requirements', 'Readiness Verdict'],
      schema: `{\n  "agent": "test_agent",\n  "coverage": "insufficient",\n  "smoke_tests_required": true,\n  "verdict": "WARN"\n}`
    }
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Agent',
    role: 'Deploy & Production Impact',
    x: 430,
    y: 455,
    labelY: 64,
    icon: Database,
    color: '#000000',
    details: {
      inputs: ['Deployment Target', 'Database Scope', 'Cloud/CI Context'],
      outputs: ['Production Impact', 'Database Risk', 'Infra Recommendation'],
      schema: `{\n  "agent": "infrastructure_agent",\n  "environment": "production",\n  "database_impact": "high",\n  "recommendation": "HOLD"\n}`
    }
  },
  {
    id: 'rollback',
    name: 'Rollback/Audit Agent',
    role: 'Rollback Plan & Audit Evidence',
    x: 650,
    y: 250,
    labelY: 58,
    icon: GitBranch,
    color: '#000000',
    details: {
      inputs: ['Reviewer Findings', 'Backup State', 'Audit Trace'],
      outputs: ['Rollback PASS/WARN/FAIL', 'Backup Freshness', 'Traceability Verdict'],
      schema: `{\n  "agent": "rollback_audit_agent",\n  "rollback_plan": "absent",\n  "backup_fresh": false,\n  "audit_trace": "present"\n}`
    }
  }
];

const connections: Connection[] = [
  { from: 'master', to: 'engineer', label: '1. Route Task', path: 'M 110 230 C 155 130, 195 85, 220 70' },
  { from: 'engineer', to: 'proposer', label: '2. Risky Plan', path: 'M 250 100 L 250 220' },
  { from: 'proposer', to: 'risk', label: '3. Risk Review', path: 'M 280 235 C 330 150, 365 80, 400 70' },
  { from: 'proposer', to: 'compliance', label: '4. Policy Check', path: 'M 280 242 C 330 195, 365 165, 400 160' },
  { from: 'proposer', to: 'security', label: '5. Security Scan', path: 'M 280 250 L 400 260' },
  { from: 'proposer', to: 'test', label: '6. Test Readiness', path: 'M 280 258 C 330 315, 365 350, 400 360' },
  { from: 'proposer', to: 'infrastructure', label: '7. Infra Impact', path: 'M 280 265 C 330 385, 365 445, 400 455' },
  { from: 'risk', to: 'rollback', label: 'Findings', path: 'M 460 75 C 545 85, 600 155, 630 225' },
  { from: 'security', to: 'rollback', label: 'Evidence', path: 'M 460 250 L 620 250' },
  { from: 'infrastructure', to: 'rollback', label: 'Backup State', path: 'M 460 445 C 545 410, 600 340, 630 275' },
  { from: 'rollback', to: 'master', label: '8. Final Packet', path: 'M 620 250 C 455 470, 210 420, 115 280' },
  { from: 'master', to: 'rollback', label: 'Human Gate', path: 'M 115 245 C 250 25, 560 25, 635 215' }
];

export function ArchitectureView() {
  const [activeNodeId, setActiveNodeId] = useState<string>('master');
  const [hoveredLink, setHoveredLink] = useState<Connection | null>(null);

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  return (
    <div className="w-full p-8 pt-8">
      {/* Title */}
      <motion.div
        className="mb-8"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[36px] font-[700] leading-tight tracking-tight mb-2">Swarm architecture</h1>
        <p className="text-[15px] text-black/60 font-[500]">
          Inspect message pathways, active connections, and JSON integration contracts of the agent matrix.
        </p>
      </motion.div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Grid: SVG Agent Network */}
        <div className="xl:col-span-7 bg-white border border-black/10 rounded-xl p-6 relative overflow-hidden flex items-center justify-center">
          
          {/* Legend */}
          <div className="absolute top-4 left-4 text-[11px] text-black/40 font-[600] flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-black" />
              Direct Route
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t border-dashed border-black/40" />
              Feedback Loop
            </span>
          </div>

          <div className="w-full max-w-[900px] aspect-[760/500]">
            <svg 
              viewBox="0 0 760 500" 
              className="w-full h-full select-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Arrow markers */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(0,0,0,0.25)" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
                </marker>
              </defs>

              {/* Connections (Lines) */}
              {connections.map((conn, idx) => {
                const isHovered = hoveredLink === conn;
                const isFeedback = conn.path.includes('C');
                
                return (
                  <g 
                    key={idx}
                    onMouseEnter={() => setHoveredLink(conn)}
                    onMouseLeave={() => setHoveredLink(null)}
                    className="cursor-pointer"
                  >
                    {/* Thick touch-target for hover */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                    />
                    
                    {/* Rendered line */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={isHovered ? '#000000' : 'rgba(0,0,0,0.1)'}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      strokeDasharray={isFeedback ? '4,4' : undefined}
                      markerEnd={isHovered ? 'url(#arrow-active)' : 'url(#arrow)'}
                      className="transition-all duration-200"
                    />

                    {/* Flowing particle animation for hovered link */}
                    {isHovered && (
                      <path
                        d={conn.path}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={2.5}
                        strokeDasharray="10,40"
                        className="animate-[dash_2s_linear_infinite]"
                        style={{
                          strokeDashoffset: 100,
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Nodes (Circles) */}
              {nodes.map((node) => {
                const isActive = activeNodeId === node.id;
                const Icon = node.icon;
                
                return (
                  <g 
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setActiveNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    {/* Ring for active node */}
                    {isActive && (
                      <motion.circle
                        r={44}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={1.5}
                        layoutId="activeArchitectureNodeRing"
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      />
                    )}

                    {/* Node bubble */}
                    <circle
                      r={34}
                      fill="#ffffff"
                      stroke={isActive ? '#000000' : 'rgba(0,0,0,0.1)'}
                      strokeWidth={isActive ? 2 : 1.5}
                      className="transition-all duration-300 hover:stroke-black"
                    />

                    {/* Icon */}
                    <g transform="translate(-14, -14)">
                      <Icon className={`w-7 h-7 ${isActive ? 'text-black' : 'text-black/40'} transition-colors duration-300`} />
                    </g>

                    {/* Label */}
                    <text
                      x={node.labelX ?? 0}
                      y={node.labelY ?? 56}
                      textAnchor="middle"
                      className={`text-[13px] font-[650] tracking-tight ${isActive ? 'fill-black font-[750]' : 'fill-black/55'}`}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Inline CSS for dash array animation */}
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: -100;
                }
              }
            `}</style>
          </div>
        </div>

        {/* Right Grid: Inspector Panel */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-black/10 rounded-xl p-6 md:p-8 flex flex-col gap-6"
            >
              {/* Header Info */}
              <div className="border-b border-black/10 pb-6 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-[700] text-black/40 uppercase tracking-wider mb-1">
                    Interface Inspector
                  </div>
                  <h2 className="text-[22px] font-[700] tracking-tight text-black flex items-center gap-2">
                    {activeNode.name}
                  </h2>
                  <p className="text-[13px] text-black/50 font-[500] mt-0.5">{activeNode.role}</p>
                </div>
                
                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center border border-black/5">
                  <activeNode.icon className="w-6 h-6 text-black" />
                </div>
              </div>

              {/* Input / Output Specs */}
              <div className="grid grid-cols-2 gap-4 border-b border-black/10 pb-6">
                <div>
                  <h4 className="text-[12px] font-[700] text-black/45 mb-2.5 uppercase tracking-wider">Inputs</h4>
                  <ul className="space-y-1.5">
                    {activeNode.details.inputs.map((inp, idx) => (
                      <li key={idx} className="text-[12px] font-[500] text-black/75 flex items-center gap-1.5 leading-tight">
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-black/30" />
                        {inp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[12px] font-[700] text-black/45 mb-2.5 uppercase tracking-wider">Outputs</h4>
                  <ul className="space-y-1.5">
                    {activeNode.details.outputs.map((out, idx) => (
                      <li key={idx} className="text-[12px] font-[500] text-black/75 flex items-center gap-1.5 leading-tight">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-black/30" />
                        {out}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Payload Schema Console */}
              <div>
                <h4 className="text-[12px] font-[700] text-black/45 mb-2.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Contract JSON schema</span>
                  <span className="flex items-center gap-1 text-[10px] font-[600] text-black/60 bg-[#f7f7f7] border border-black/5 px-1.5 py-0.5 rounded uppercase font-sans">
                    <Terminal className="w-3 h-3 text-black/40" />
                    payload
                  </span>
                </h4>

                <div className="bg-[#f7f7f7] border border-black/5 rounded-xl p-4 font-mono text-[12px] text-black/75 overflow-x-auto whitespace-pre leading-relaxed select-text">
                  {activeNode.details.schema}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Hovered Connection helper */}
          {hoveredLink && (
            <motion.div 
              className="bg-black text-white p-4 rounded-xl flex items-center justify-between"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-white/70" />
                <span className="text-[12px] font-[600]">
                  Connection Protocol: <strong className="font-[700] text-white ml-1">{hoveredLink.label}</strong>
                </span>
              </div>
              <span className="text-[11px] font-[600] text-white/50">{hoveredLink.from} $\rightarrow$ {hoveredLink.to}</span>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
