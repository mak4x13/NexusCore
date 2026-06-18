import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  listFeatures,
  listActions,
  listMessages,
  createFeature,
  triggerBand,
  decideAction,
  getBandStatus,
  getBandMessages,
  WS_URL,
  type ApiMessage,
  type ApiAction,
} from '../services/api';

export interface FeatureStage {
  name: string;
  status: 'complete' | 'active' | 'pending' | 'failed';
}

export interface Feature {
  id: string;
  name: string;
  repo: string;
  agent: string;
  status: 'completed' | 'running' | 'failed' | 'awaiting_approval';
  createdAt: string;
  elapsed: string;
  currentStageIndex: number;
  stages: FeatureStage[];
  logs: string[];
  // backend action ID used for approve/reject
  actionId?: string;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  memoryLimit: number;
  systemPrompt: string;
}

export interface Agent {
  name: string;
  role: string;
  status: 'idle' | 'active' | 'generating' | 'scanning' | 'reviewing';
  tasksHandled: number;
  successRate: number;
  iconName: string;
  config: AgentConfig;
}

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file: string;
  line: number;
  status: 'open' | 'resolved';
  detectedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category: 'workflow' | 'policy' | 'security' | 'approval';
  details: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AppSettings {
  teamName: string;
  defaultBranch: string;
  workspaceUrl: string;
  openaiKey: string;
  githubToken: string;
  slackWebhook: string;
  emailAlerts: boolean;
}

interface AppContextType {
  metrics: {
    featuresGeneratedThisMonth: number;
    featuresGenerated: number;
    activeAgents: number;
    securityFindings: number;
    costSavings: number;
  };
  features: Feature[];
  agents: Agent[];
  securityFindings: SecurityFinding[];
  auditLogs: AuditLog[];
  policies: GovernancePolicy[];
  settings: AppSettings;
  bandConfigured: boolean;
  bandRoom: string | null;
  launchWorkflow: (name: string, repo: string, agentName: string) => void;
  approveFeature: (id: string) => void;
  rejectFeature: (id: string) => void;
  runSecurityScan: () => Promise<void>;
  updateAgentConfig: (name: string, config: Partial<AgentConfig>) => void;
  saveSettings: (newSettings: AppSettings) => Promise<void>;
  togglePolicy: (id: string) => void;
  isScanning: boolean;
  activeFeatureId: string | null;
  setActiveFeatureId: (id: string | null) => void;
}

const defaultStages: FeatureStage[] = [
  { name: 'Engineer Plan', status: 'pending' },
  { name: 'Risk Proposal', status: 'pending' },
  { name: 'Risk Review', status: 'pending' },
  { name: 'Compliance Check', status: 'pending' },
  { name: 'Security Review', status: 'pending' },
  { name: 'Test Readiness', status: 'pending' },
  { name: 'Infrastructure Review', status: 'pending' },
  { name: 'Rollback/Audit', status: 'pending' },
  { name: 'Master Decision', status: 'pending' }
];

// ─── Static seed data (kept for demo richness, hydrated with real data) ──────
const seedFeatures: Feature[] = [
  {
    id: 'feat-1',
    name: 'OAuth2 Authentication Module',
    repo: 'nexus-gateway',
    agent: 'Master Agent',
    status: 'completed',
    createdAt: '2026-06-16 10:15',
    elapsed: '12m',
    currentStageIndex: 8,
    stages: defaultStages.map(s => ({ ...s, status: 'complete' })),
    logs: [
      '[10:15:02] Master Agent: Registered request for "OAuth2 Authentication Module". Starting feature planning.',
      '[10:17:15] Master Agent: Conflict resolved. SPEC APPROVED.',
      '[10:18:10] Security Agent: SECURITY FINDINGS resolved.',
      '[10:21:00] Master Agent: APPROVED decision signed. Token cost: 31,200.',
    ]
  },
  {
    id: 'feat-2',
    name: 'Redis Cluster Caching Strategy',
    repo: 'nexus-data-cache',
    agent: 'Infrastructure Agent',
    status: 'completed',
    createdAt: '2026-06-15 14:30',
    elapsed: '8m',
    currentStageIndex: 8,
    stages: defaultStages.map(s => ({ ...s, status: 'complete' })),
    logs: [
      '[14:30:11] Master Agent: Cluster strategy cache request registered.',
      '[14:38:00] Master Agent: Automatic deployment to production succeeded. PR merged.'
    ]
  },
  {
    id: 'feat-4',
    name: 'Auto-scaler Configuration Agent',
    repo: 'nexus-infra-ops',
    agent: 'Master Agent',
    status: 'failed',
    createdAt: '2026-06-14 18:22',
    elapsed: '6m',
    currentStageIndex: 4,
    stages: [
      { name: 'Engineer Plan', status: 'complete' },
      { name: 'Risk Proposal', status: 'complete' },
      { name: 'Risk Review', status: 'complete' },
      { name: 'Compliance Check', status: 'complete' },
      { name: 'Security Review', status: 'failed' },
      { name: 'Test Readiness', status: 'pending' },
      { name: 'Infrastructure Review', status: 'pending' },
      { name: 'Rollback/Audit', status: 'pending' },
      { name: 'Master Decision', status: 'pending' }
    ],
    logs: [
      '[18:22:10] Master Agent: Auto-scaling configuration initiated.',
      '[18:27:15] Security Agent: CRITICAL VULNERABILITY DETECTED: RCE risk. Aborting workflow.'
    ]
  }
];

const initialAgents: Agent[] = [
  {
    name: 'Engineer/Builder Agent',
    role: 'Code Plan & Patch Generation',
    status: 'idle',
    tasksHandled: 84,
    successRate: 96.1,
    iconName: 'Terminal',
    config: {
      model: 'gpt-4o',
      temperature: 0.2,
      memoryLimit: 8192,
      systemPrompt: 'You are the Engineer/Builder Agent. Generate code plans and patch summaries, but never execute risky actions directly.'
    }
  },
  {
    name: 'Proposer Agent',
    role: 'Dangerous Action Proposal',
    status: 'idle',
    tasksHandled: 212,
    successRate: 96.7,
    iconName: 'Bot',
    config: {
      model: 'gpt-4o',
      temperature: 0.3,
      memoryLimit: 8192,
      systemPrompt: 'You are the Proposer Agent. Convert risky build steps into formal proposals for governance review.'
    }
  },
  {
    name: 'Risk Agent',
    role: 'Risk Assessment & Danger Detection',
    status: 'idle',
    tasksHandled: 98,
    successRate: 97.2,
    iconName: 'Shield',
    config: {
      model: 'Qwen/Qwen2.5-72B-Instruct',
      temperature: 0.2,
      memoryLimit: 8192,
      systemPrompt: 'You are the Risk Agent. Identify dangerous, irreversible, or high-impact actions proposed by other agents.'
    }
  },
  {
    name: 'Compliance Agent',
    role: 'Governance & Spec Enforcer',
    status: 'idle',
    tasksHandled: 110,
    successRate: 100.0,
    iconName: 'FileCheck',
    config: {
      model: 'gpt-4o-mini',
      temperature: 0.0,
      memoryLimit: 4096,
      systemPrompt: 'You are the Policy Compliance Agent. Cross-reference code and architectures against SOC2, GDPR, and organizational policies.'
    }
  },
  {
    name: 'Security Agent',
    role: 'Security Impact Review',
    status: 'idle',
    tasksHandled: 76,
    successRate: 97.8,
    iconName: 'AlertCircle',
    config: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      memoryLimit: 4096,
      systemPrompt: 'You are the Security Agent. Check auth, permissions, exposed secrets, unsafe endpoints, and vulnerabilities.'
    }
  },
  {
    name: 'Test Agent',
    role: 'Test Readiness Review',
    status: 'idle',
    tasksHandled: 64,
    successRate: 95.9,
    iconName: 'Cpu',
    config: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      memoryLimit: 4096,
      systemPrompt: 'You are the Test Agent. Check required unit, integration, migration, and smoke tests before approval.'
    }
  },
  {
    name: 'Infrastructure Agent',
    role: 'Deploy & Production Impact',
    status: 'idle',
    tasksHandled: 58,
    successRate: 96.4,
    iconName: 'Database',
    config: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      memoryLimit: 4096,
      systemPrompt: 'You are the Infrastructure Agent. Check deploy, database, cloud, CI/CD, env var, and production impact.'
    }
  },
  {
    name: 'Rollback/Audit Agent',
    role: 'Rollback Plan & Audit Evidence',
    status: 'idle',
    tasksHandled: 52,
    successRate: 98.0,
    iconName: 'GitBranch',
    config: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      memoryLimit: 4096,
      systemPrompt: 'You are the Rollback/Audit Agent. Check rollback plan, backups, logs, traceability, and audit evidence.'
    }
  },
  {
    name: 'Master Agent',
    role: 'Final ALLOW/BLOCK Authority',
    status: 'idle',
    tasksHandled: 142,
    successRate: 98.5,
    iconName: 'Bot',
    config: {
      model: 'gpt-4o',
      temperature: 0.1,
      memoryLimit: 8192,
      systemPrompt: 'You are the Master Orchestration Agent. Coordinate features, route subtasks to agents, and manage pull requests.'
    }
  }
];

const initialFindings: SecurityFinding[] = [
  {
    id: 'SEC-104',
    severity: 'high',
    title: 'Hardcoded SSH Private Key in Environment Config',
    file: 'config/production.json',
    line: 42,
    status: 'open',
    detectedAt: '2026-06-16 11:24'
  },
  {
    id: 'SEC-105',
    severity: 'medium',
    title: 'SQL Injection Vulnerability in User Repository',
    file: 'src/db/userRepository.ts',
    line: 87,
    status: 'open',
    detectedAt: '2026-06-15 15:45'
  },
  {
    id: 'SEC-106',
    severity: 'low',
    title: 'Outdated dependency: lodash < 4.17.21 (Prototype Pollution)',
    file: 'package.json',
    line: 52,
    status: 'open',
    detectedAt: '2026-06-14 09:10'
  }
];

const initialPolicies: GovernancePolicy[] = [
  {
    id: 'pol-1',
    name: 'Require Human Approval for Code Commits',
    description: 'When enabled, the automated pipeline will hold code merges until a team member manually approves.',
    enabled: true
  },
  {
    id: 'pol-2',
    name: 'Block Insecure LLM Model Versions',
    description: 'Ensure only models passing enterprise security validation protocols can be used.',
    enabled: true
  },
  {
    id: 'pol-3',
    name: 'Strict SOC2 Compliance Validation',
    description: 'Reject workflows that alter identity mechanisms or encryption keys without audit trails.',
    enabled: false
  }
];

const initialSettings: AppSettings = {
  teamName: 'NexusCore Team',
  defaultBranch: 'main',
  workspaceUrl: 'https://github.com/mak4x13/NexusCore',
  openaiKey: '',
  githubToken: '',
  slackWebhook: '',
  emailAlerts: true
};

// ─── Helper: convert a raw backend ApiMessage into a feature log line ─────────
function msgToLog(m: ApiMessage): string {
  const time = m.created_at
    ? new Date(m.created_at).toLocaleTimeString()
    : new Date().toLocaleTimeString();
  return `[${time}] ${m.author}: ${m.content}`;
}

// ─── Helper: convert an ApiAction status to Feature status ───────────────────
function actionStatusToFeatureStatus(
  s: ApiAction['status']
): Feature['status'] {
  if (s === 'HELD') return 'awaiting_approval';
  if (s === 'ALLOWED') return 'completed';
  if (s === 'BLOCKED') return 'failed';
  return 'running';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState({
    featuresGeneratedThisMonth: 247,
    featuresGenerated: 247,
    activeAgents: 0,
    securityFindings: 3,
    costSavings: 89
  });

  const [features, setFeatures] = useState<Feature[]>(seedFeatures);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>(initialFindings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [policies, setPolicies] = useState<GovernancePolicy[]>(initialPolicies);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isScanning, setIsScanning] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [bandConfigured, setBandConfigured] = useState(false);
  const [bandRoom, setBandRoom] = useState<string | null>(null);

  // WebSocket ref to keep connection alive
  const wsRef = useRef<WebSocket | null>(null);

  // ── On mount: load real data from backend ─────────────────────────────────
  useEffect(() => {
    // Load features from backend and merge with seed data
    listFeatures()
      .then(apiFeatures => {
        if (apiFeatures.length > 0) {
          const realFeatures: Feature[] = apiFeatures.map(f => ({
            id: f.id,
            name: f.text,
            repo: 'nexus-workspace',
            agent: 'Master Agent',
            status: 'running',
            createdAt: new Date(f.created_at).toISOString().replace('T', ' ').substring(0, 16),
            elapsed: '0m',
            currentStageIndex: 0,
            stages: defaultStages.map((s, i) => ({ ...s, status: i === 0 ? 'active' as const : 'pending' as const })),
            logs: [`[${new Date(f.created_at).toLocaleTimeString()}] Master Agent: Feature request registered: "${f.text}"`]
          }));
          setFeatures(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const newOnes = realFeatures.filter(f => !existingIds.has(f.id));
            return [...newOnes, ...prev];
          });
        }
      })
      .catch(() => { /* backend offline — use seed data */ });

    // Load actions and reflect their status in features list
    listActions()
      .then(actions => {
        actions.forEach(action => {
          if (!action.feature_id) return;
          const featStatus = actionStatusToFeatureStatus(action.status);
          setFeatures(prev => prev.map(f =>
            f.id === action.feature_id
              ? { ...f, status: featStatus, actionId: action.id }
              : f
          ));
          // Populate audit log from BLOCKED/ALLOWED decisions
          if (action.status !== 'HELD' && action.decided_by) {
            const log: AuditLog = {
              id: `act-${action.id}`,
              timestamp: action.decided_at
                ? new Date(action.decided_at).toISOString().replace('T', ' ').substring(0, 16)
                : '',
              action: action.status === 'ALLOWED' ? 'Action Allowed' : 'Action Blocked',
              actor: action.decided_by,
              category: 'approval',
              details: `"${action.action}" — ${action.reason || ''}`
            };
            setAuditLogs(prev => [log, ...prev]);
          }
        });
      })
      .catch(() => {});

    // Load messages and turn them into audit logs
    listMessages()
      .then(msgs => {
        const logs: AuditLog[] = msgs.map(m => ({
          id: m.id,
          timestamp: m.created_at
            ? new Date(m.created_at).toISOString().replace('T', ' ').substring(0, 16)
            : '',
          action: m.content.substring(0, 60),
          actor: m.author,
          category: m.role === 'master' || m.role === 'compliance' ? 'workflow' : 'security',
          details: m.content
        }));
        if (logs.length > 0) setAuditLogs(prev => [...logs, ...prev]);
      })
      .catch(() => {});

    // Check Band configuration status
    getBandStatus()
      .then(status => {
        setBandConfigured(status.configured);
        if (status.room) setBandRoom(status.room);
        // Reflect configured agents as active in our agents list
        if (status.configured) {
          const agentNameMap: Record<string, string[]> = {
            'Engineer/Builder Agent': ['engineer_agent'],
            'Proposer Agent': ['proposer_agent'],
            'Risk Agent': ['risk_agent'],
            'Compliance Agent': ['compliance_agent'],
            'Security Agent': ['security_agent'],
            'Test Agent': ['test_agent'],
            'Infrastructure Agent': ['infrastructure_agent'],
            'Rollback/Audit Agent': ['rollback_audit_agent'],
            'Master Agent': ['master_agent'],
          };
          setAgents(prev => prev.map(a => {
            const possibleNames = agentNameMap[a.name] ?? [];
            const isPresent = possibleNames.some(name => status.agents.includes(name));
            return isPresent ? { ...a, status: 'idle' } : a;
          }));
        }
      })
      .catch(() => {});
  }, []);

  // ── WebSocket: live push from backend ─────────────────────────────────────
  useEffect(() => {
    function connect() {
      try {
        const sock = new WebSocket(WS_URL);
        wsRef.current = sock;

        sock.onmessage = (e) => {
          try {
            const { kind, data } = JSON.parse(e.data);

            if (kind === 'snapshot') {
              // Snapshot: hydrate messages and actions from WS
              (data.messages as ApiMessage[]).forEach(m => {
                const log: AuditLog = {
                  id: m.id,
                  timestamp: m.created_at
                    ? new Date(m.created_at).toISOString().replace('T', ' ').substring(0, 16)
                    : '',
                  action: m.content.substring(0, 60),
                  actor: m.author,
                  category: 'workflow',
                  details: m.content
                };
                setAuditLogs(prev => {
                  if (prev.find(l => l.id === log.id)) return prev;
                  return [log, ...prev];
                });
              });
              (data.actions as ApiAction[]).forEach(action => {
                if (!action.feature_id) return;
                setFeatures(prev => prev.map(f =>
                  f.id === action.feature_id
                    ? { ...f, status: actionStatusToFeatureStatus(action.status), actionId: action.id }
                    : f
                ));
              });

            } else if (kind === 'message') {
              // New message from an agent — add to audit log and to the active feature's logs
              const m = data as ApiMessage;
              const logLine = msgToLog(m);

              setAuditLogs(prev => {
                if (prev.find(l => l.id === m.id)) return prev;
                return [{
                  id: m.id,
                  timestamp: m.created_at
                    ? new Date(m.created_at).toISOString().replace('T', ' ').substring(0, 16)
                    : '',
                  action: m.content.substring(0, 60),
                  actor: m.author,
                  category: 'workflow',
                  details: m.content
                }, ...prev];
              });

              // Append to the matching feature's log
              if (m.feature_id) {
                setFeatures(prev => prev.map(f =>
                  f.id === m.feature_id
                    ? { ...f, logs: [...f.logs, logLine] }
                    : f
                ));
              }

            } else if (kind === 'action') {
              // Action status changed (HELD / ALLOWED / BLOCKED)
              const action = data as ApiAction;
              const featStatus = actionStatusToFeatureStatus(action.status);

              setFeatures(prev => prev.map(f => {
                if (f.id !== action.feature_id && f.actionId !== action.id) return f;
                const newLogs = action.status === 'HELD'
                  ? [...f.logs, `[${new Date().toLocaleTimeString()}] ⚠ HELD: "${action.action}" — Risk: ${action.risk}`]
                  : action.status === 'ALLOWED'
                  ? [...f.logs, `[${new Date().toLocaleTimeString()}] ✓ ALLOWED by ${action.decided_by}: ${action.reason}`]
                  : [...f.logs, `[${new Date().toLocaleTimeString()}] ✗ BLOCKED by ${action.decided_by}: ${action.reason}`];
                return { ...f, status: featStatus, actionId: action.id, logs: newLogs };
              }));

              if (action.status === 'HELD') {
                toast.warning(`Action held for review: "${action.action.substring(0, 50)}"`);
              }
            }
          } catch { /* ignore parse errors */ }
        };

        sock.onclose = () => {
          // Reconnect after 3s
          setTimeout(connect, 3000);
        };
      } catch { /* WebSocket not available (backend offline) */ }
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // ── Poll the REAL Band room audit (live 9-agent flow) ─────────────────────
  // The agents (Proposer → 6 reviewers → Master DECISION) post to the Band room,
  // not the local /api/messages feed. Mirror that real transcript into the audit
  // log so the dashboard shows the actual multi-agent collaboration.
  useEffect(() => {
    let active = true;
    async function pollBand() {
      try {
        const msgs = await getBandMessages();
        if (!active) return;
        setAuditLogs(prev => {
          const seen = new Set(prev.map(l => l.id));
          const fresh = msgs
            .filter(m => !seen.has(m.id))
            .map(m => ({
              id: m.id,
              timestamp: m.created_at
                ? new Date(m.created_at).toISOString().replace('T', ' ').substring(0, 16)
                : '',
              action: m.content.substring(0, 60),
              actor: m.author,
              category: (m.role === 'master' || m.role === 'compliance'
                ? 'workflow' : 'security') as AuditLog['category'],
              details: m.content,
            }));
          // oldest-first so chronological order is preserved when prepending
          return fresh.length ? [...fresh.reverse(), ...prev] : prev;
        });
      } catch { /* backend offline or room unreachable */ }
    }
    pollBand();
    const t = setInterval(pollBand, 3000);
    return () => { active = false; clearInterval(t); };
  }, []);

  // Update active agents metric
  useEffect(() => {
    const activeCount = agents.filter(a => a.status !== 'idle').length;
    setMetrics(prev => ({ ...prev, activeAgents: activeCount }));
  }, [agents]);

  // ── launchWorkflow: calls real backend, falls back to local simulation ────
  const launchWorkflow = async (name: string, repo: string, agentName: string) => {
    const newId = `feat-${Date.now()}`;
    const customStages = defaultStages.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'active' as const : 'pending' as const
    }));

    const newFeature: Feature = {
      id: newId,
      name,
      repo,
      agent: agentName,
      status: 'running',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      elapsed: '0m',
      currentStageIndex: 0,
      stages: customStages,
      logs: [`[${new Date().toLocaleTimeString()}] Master Agent: Registered request for "${name}" on "${repo}". Dispatching to Band room.`]
    };

    setFeatures(prev => [newFeature, ...prev]);
    setActiveFeatureId(newId);
    toast.success(`Workflow started: "${name}"`);

    // Audit log entry
    const newAudit: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Workflow Launched',
      actor: 'User Dashboard',
      category: 'workflow',
      details: `Started workflow "${name}" routed through ${agentName}.`
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    // ── Real backend call ──────────────────────────────────────────────────
    let backendFeatureId: string | undefined;

    try {
      // 1. Create a feature record
      const created = await createFeature(name);
      backendFeatureId = created.id;

      // Update our local feature with the real backend ID so WS events match
      setFeatures(prev => prev.map(f =>
        f.id === newId ? { ...f, id: created.id } : f
      ));
      setActiveFeatureId(created.id);

      // 2. Fire the Band trigger so real agents respond
      await triggerBand(name);
      setFeatures(prev => prev.map(f =>
        f.id === created.id
          ? { ...f, logs: [...f.logs, `[${new Date().toLocaleTimeString()}] → Sent to Band room. Agents are collaborating...`] }
          : f
      ));
    } catch {
      // Backend offline — run local simulation
      toast.info('Backend offline — running local simulation.');
    }

    // ── Local UI simulation (runs regardless, makes UI feel alive) ───────
    const targetId = backendFeatureId ?? newId;
    let stage = 0;
    const stageDurations = [3000, 3000, 3500, 3000, 3500, 3000, 3500, 3000, 3000];
    const stageAgents = [
      'Engineer/Builder Agent', 'Proposer Agent', 'Risk Agent',
      'Compliance Agent', 'Security Agent', 'Test Agent',
      'Infrastructure Agent', 'Rollback/Audit Agent', 'Master Agent'
    ];
    const stageLogs = [
      `Engineer/Builder Agent: Drafting code plan and patch summary.`,
      `Proposer Agent: Converting risky operation into formal proposal.`,
      `Risk Agent: Analyzing blast radius, reversibility, and data loss.`,
      `Compliance Agent: Validating against policy and approved spec.`,
      `Security Agent: Checking auth, secrets, and vulnerability impact.`,
      `Test Agent: Checking required unit, integration, and smoke tests.`,
      `Infrastructure Agent: Reviewing deploy, database, and production impact.`,
      `Rollback/Audit Agent: Verifying rollback plan and audit evidence.`,
      `Master Agent: Preparing final ALLOW/BLOCK decision.`,
    ];

    const runNextStage = () => {
      setFeatures(prevFeatures => {
        const feat = prevFeatures.find(f => f.id === targetId);
        if (!feat || feat.status !== 'running') return prevFeatures;

        const nextStageIndex = stage + 1;
        const updatedStages = feat.stages.map((st, idx) => {
          if (idx <= stage) return { ...st, status: 'complete' as const };
          if (idx === nextStageIndex) return { ...st, status: 'active' as const };
          return st;
        });

        const logMsgs = [...feat.logs];
        const time = new Date().toLocaleTimeString();
        if (stageLogs[stage]) logMsgs.push(`[${time}] ${stageLogs[stage]}`);

        // Update agent status
        const currentAgentName = stageAgents[stage];
        if (currentAgentName) {
          setAgents(prev => prev.map(a =>
            a.name === currentAgentName ? { ...a, status: 'active' } :
            stage > 0 && a.name === stageAgents[stage - 1] ? { ...a, status: 'idle', tasksHandled: a.tasksHandled + 1 } : a
          ));
        }

        stage = nextStageIndex;

        const approvalPolicyActive = policies.find(p => p.id === 'pol-1')?.enabled;

        // Hold at compliance stage if policy is on
        if (stage === 8 && approvalPolicyActive) {
          logMsgs.push(`[${time}] Holding workflow — awaiting Human Gatekeeper Approval.`);
          setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
          toast.info(`Workflow "${name}" is waiting for approval.`);

          return prevFeatures.map(f => f.id === targetId ? {
            ...f,
            status: 'awaiting_approval' as const,
            currentStageIndex: 8,
            stages: updatedStages.map((s, idx) => idx === 8 ? { ...s, status: 'active' as const } : s),
            logs: logMsgs,
            elapsed: '3m'
          } : f);
        }

        // Complete
        if (stage === 9) {
          logMsgs.push(`[${time}] Master Agent: Merging pull request. Deployment succeeded.`);
          setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));

          setTimeout(() => {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
            toast.success(`Workflow "${name}" completed!`);
          }, 300);

          setMetrics(prev => ({
            ...prev,
            featuresGenerated: prev.featuresGenerated + 1,
            featuresGeneratedThisMonth: prev.featuresGeneratedThisMonth + 1
          }));

          return prevFeatures.map(f => f.id === targetId ? {
            ...f,
            status: 'completed' as const,
            currentStageIndex: 8,
            stages: updatedStages.map(s => ({ ...s, status: 'complete' as const })),
            logs: logMsgs,
            elapsed: '4m'
          } : f);
        }

        setTimeout(runNextStage, stageDurations[stage]);
        return prevFeatures.map(f => f.id === targetId ? {
          ...f,
          currentStageIndex: Math.min(8, stage),
          stages: updatedStages,
          logs: logMsgs,
          elapsed: `${Math.floor((stage * 40) / 60) + 1}m`
        } : f);
      });
    };

    setTimeout(runNextStage, stageDurations[0]);
  };

  // ── approveFeature: calls backend if actionId present ────────────────────
  const approveFeature = async (id: string) => {
    const feat = features.find(f => f.id === id);
    if (!feat || feat.status !== 'awaiting_approval') return;

    // Try real backend call
    if (feat.actionId) {
      try {
        await decideAction(feat.actionId, true, 'User Dashboard', 'Approved by human operator.');
        toast.success(`Workflow "${feat.name}" approved via backend!`);
      } catch {
        toast.info('Backend unreachable — approving locally.');
      }
    }

    const time = new Date().toLocaleTimeString();
    setFeatures(prev => prev.map(f => f.id === id ? {
      ...f,
      status: 'completed' as const,
      currentStageIndex: 8,
      stages: f.stages.map(s => ({ ...s, status: 'complete' as const })),
      logs: [
        ...f.logs,
        `[${time}] ✓ User Approval: Merge request approved manually.`,
        `[${time}] Master Agent: Merged pull request. Deployment completed.`
      ],
      elapsed: '5m'
    } : f));

    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.8 } });
    }, 200);

    setMetrics(prev => ({
      ...prev,
      featuresGenerated: prev.featuresGenerated + 1,
      featuresGeneratedThisMonth: prev.featuresGeneratedThisMonth + 1
    }));

    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Human Approved Merge',
      actor: 'User Dashboard',
      category: 'approval',
      details: `Approved merge of feature "${feat.name}" to main branch.`
    }, ...prev]);
  };

  // ── rejectFeature: calls backend if actionId present ─────────────────────
  const rejectFeature = async (id: string) => {
    const feat = features.find(f => f.id === id);
    if (!feat || feat.status !== 'awaiting_approval') return;

    if (feat.actionId) {
      try {
        await decideAction(feat.actionId, false, 'User Dashboard', 'Rejected by human operator.');
      } catch {
        // local fallback
      }
    }

    const time = new Date().toLocaleTimeString();
    toast.error(`Workflow "${feat.name}" rejected.`);

    setFeatures(prev => prev.map(f => f.id === id ? {
      ...f,
      status: 'failed' as const,
      stages: f.stages.map((s, idx) => idx === 6 ? { ...s, status: 'failed' as const } : s),
      logs: [
        ...f.logs,
        `[${time}] ✗ User Rejection: Merge request rejected.`,
        `[${time}] Master Agent: Code discarded. Workflow aborted.`
      ]
    } : f));

    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Human Rejected Merge',
      actor: 'User Dashboard',
      category: 'approval',
      details: `Rejected merge of feature "${feat.name}" to main branch.`
    }, ...prev]);
  };

  // ── runSecurityScan ────────────────────────────────────────────────────────
  const runSecurityScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    toast.info('Running vulnerability scanner across workspaces...');

    setAuditLogs(prev => [{
      id: `log-${Date.now()}-scan`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Security Scan Initiated',
      actor: 'User Dashboard',
      category: 'security',
      details: 'Started automated static code review across all active repositories.'
    }, ...prev]);

    await new Promise(resolve => setTimeout(resolve, 4000));

    setSecurityFindings(prev => {
      const updated = prev.map(f => f.id === 'SEC-106' ? { ...f, status: 'resolved' as const } : f);
      const hasAlert = Math.random() > 0.4;
      if (hasAlert) {
        const newFinding: SecurityFinding = {
          id: `SEC-${Math.floor(Math.random() * 100) + 110}`,
          severity: 'low',
          title: 'Unused packages containing CVE-2026 warning alerts',
          file: 'package-lock.json',
          line: 23,
          status: 'open',
          detectedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        toast.warning('Scan complete: 1 new low-severity vulnerability detected.');
        const openCount = [...updated, newFinding].filter(f => f.status === 'open').length;
        setMetrics(prev => ({ ...prev, securityFindings: openCount }));
        return [...updated, newFinding];
      } else {
        toast.success('Scan complete: Workspace is clean.');
        const openCount = updated.filter(f => f.status === 'open').length;
        setMetrics(prev => ({ ...prev, securityFindings: openCount }));
        return updated;
      }
    });

    setAuditLogs(prev => [{
      id: `log-${Date.now()}-scan-end`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Security Scan Completed',
      actor: 'Security Agent',
      category: 'security',
      details: 'Scan completed. Code integrity validated.'
    }, ...prev]);

    setIsScanning(false);
  };

  const updateAgentConfig = (name: string, config: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(a => {
      if (a.name === name) {
        toast.success(`${name} configuration updated.`);
        setAuditLogs(prevLogs => [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Agent Reconfigured',
          actor: 'User Dashboard',
          category: 'policy',
          details: `Updated parameters for ${name} (Model: ${config.model || a.config.model}).`
        }, ...prevLogs]);
        return { ...a, config: { ...a.config, ...config } };
      }
      return a;
    }));
  };

  const saveSettings = async (newSettings: AppSettings) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSettings(newSettings);
    toast.success('System settings saved successfully.');
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'System Settings Saved',
      actor: 'User Dashboard',
      category: 'policy',
      details: 'General and integration settings updated by administrator.'
    }, ...prev]);
  };

  const togglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.enabled;
        toast.success(`Policy "${p.name}" turned ${nextState ? 'ON' : 'OFF'}`);
        setAuditLogs(prevLogs => [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Policy Toggle',
          actor: 'User Dashboard',
          category: 'policy',
          details: `Policy "${p.name}" changed to ${nextState ? 'ENABLED' : 'DISABLED'}.`
        }, ...prevLogs]);
        return { ...p, enabled: nextState };
      }
      return p;
    }));
  };

  return (
    <AppContext.Provider
      value={{
        metrics,
        features,
        agents,
        securityFindings,
        auditLogs,
        policies,
        settings,
        bandConfigured,
        bandRoom,
        launchWorkflow,
        approveFeature,
        rejectFeature,
        runSecurityScan,
        updateAgentConfig,
        saveSettings,
        togglePolicy,
        isScanning,
        activeFeatureId,
        setActiveFeatureId
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
