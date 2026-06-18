import { useState, useMemo } from 'react';
import { useApp, AuditLog } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck, Shield, Lock, UserCheck, Search, Clock, 
  Check, X, ChevronRight, AlertTriangle, ShieldCheck, Play
} from 'lucide-react';
import { decideAction, interceptCommand, type ApiAction } from '../services/api';

export function GovernanceView() {
  const { 
    policies, 
    auditLogs, 
    togglePolicy, 
    features, 
    approveFeature, 
    rejectFeature 
    , addAuditLog
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'workflow' | 'policy' | 'security' | 'approval'>('all');
  const [command, setCommand] = useState('DROP DATABASE users');
  const [interceptedAction, setInterceptedAction] = useState<ApiAction | null>(null);
  const [interceptorBusy, setInterceptorBusy] = useState(false);
  const [interceptorError, setInterceptorError] = useState<string | null>(null);

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.actor.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (categoryFilter === 'all') return matchesSearch;
      return matchesSearch && log.category === categoryFilter;
    });
  }, [auditLogs, searchQuery, categoryFilter]);

  // Find features holding for approval
  const pendingApprovals = useMemo(() => {
    return features.filter(f => f.status === 'awaiting_approval');
  }, [features]);

  const runInterceptorDemo = async () => {
    setInterceptorBusy(true);
    setInterceptorError(null);
    try {
      const action = await interceptCommand({
        command,
        actor: 'Demo Runtime Wrapper',
        environment: 'production',
        estimated_records: command.toLowerCase().includes('delete') ? 147000 : undefined,
      });
      setInterceptedAction(action);
      addAuditLog({
        id: `action-${action.id}-${action.status}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: action.status === 'HELD'
          ? `Action Held (${action.risk_tier})`
          : 'Action Allowed',
        actor: action.status === 'HELD'
          ? action.agent
          : action.decided_by || 'Action Interceptor',
        category: action.status === 'HELD' || action.risk_tier === 'CRITICAL'
          ? 'security'
          : 'approval',
        details: `${action.action} — ${action.interceptor_reason || action.reason || ''}`,
      });
    } catch (err) {
      setInterceptorError(err instanceof Error ? err.message : 'Interceptor request failed');
    } finally {
      setInterceptorBusy(false);
    }
  };

  const decideInterceptedAction = async (allow: boolean) => {
    if (!interceptedAction) return;
    setInterceptorBusy(true);
    setInterceptorError(null);
    try {
      const action = await decideAction(
        interceptedAction.id,
        allow,
        'Human Gatekeeper',
        allow
          ? 'Critical runtime action manually confirmed for demo.'
          : 'Rejected by human gatekeeper during runtime review.',
        allow && interceptedAction.human_confirmation_required
      );
      setInterceptedAction(action);
      addAuditLog({
        id: `action-${action.id}-${action.status}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: allow ? 'Action Allowed' : 'Action Blocked',
        actor: action.decided_by || 'Human Gatekeeper',
        category: 'approval',
        details: `${action.action} — ${action.reason || ''}`,
      });
    } catch (err) {
      setInterceptorError(err instanceof Error ? err.message : 'Decision request failed');
    } finally {
      setInterceptorBusy(false);
    }
  };

  return (
    <div className="w-full p-8 pt-8">
      {/* Title */}
      <motion.div
        className="mb-8"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[36px] font-[700] leading-tight tracking-tight mb-2">Swarm governance</h1>
        <p className="text-[15px] text-black/60 font-[500]">
          Enforce compliance policies, review audit logs, and approve automated deployment commits.
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Policies & Approvals */}
        <div className="lg:col-span-6 flex flex-col gap-8">
          
          {/* Policy controls card */}
          <div className="bg-white border border-black/10 rounded-xl p-6">
            <h3 className="text-[17px] font-[700] text-black mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-black/60" />
              Compliance guardrails
            </h3>
            
            <div className="space-y-6">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-[14px] font-[600] text-black mb-1">{policy.name}</h4>
                    <p className="text-[12px] text-black/55 leading-normal">{policy.description}</p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    onClick={() => togglePolicy(policy.id)}
                    className={`
                      w-11 h-6 rounded-full p-0.5 transition-all duration-200 focus:outline-none shrink-0 cursor-pointer
                      ${policy.enabled ? 'bg-black' : 'bg-black/10'}
                    `}
                  >
                    <div 
                      className={`
                        w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-sm
                        ${policy.enabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Runtime Interceptor Demo */}
          <div className="bg-white border border-black/10 rounded-xl p-6">
            <h3 className="text-[17px] font-[700] text-black mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-black/60" />
              Runtime action interceptor
            </h3>
            <p className="text-[12px] text-black/55 leading-normal mb-4">
              Safe demo wrapper: commands are classified and held before execution. Nothing is actually run.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="flex-1 h-9 px-3 bg-[#f7f7f7] border border-black/10 rounded-lg text-[12px] font-mono outline-none focus:border-black/30"
                placeholder="Try: DROP DATABASE users"
              />
              <button
                onClick={runInterceptorDemo}
                disabled={interceptorBusy || command.trim().length === 0}
                className="h-9 px-4 bg-black text-white rounded-lg text-[12px] font-[700] flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Intercept
              </button>
            </div>

            {interceptorError && (
              <div className="mb-4 text-[12px] font-[600] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {interceptorError}
              </div>
            )}

            {interceptedAction && (
              <div className="border border-black/10 rounded-xl p-4 bg-[#f7f7f7]/45">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[11px] font-[800] px-2 py-1 rounded-full ${
                    interceptedAction.risk_tier === 'CRITICAL'
                      ? 'bg-red-100 text-red-700'
                      : interceptedAction.risk_tier === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {interceptedAction.risk_tier}
                  </span>
                  <span className="text-[11px] font-[800] px-2 py-1 rounded-full bg-white border border-black/10">
                    {interceptedAction.status}
                  </span>
                  {interceptedAction.human_confirmation_required && (
                    <span className="text-[11px] font-[800] px-2 py-1 rounded-full bg-black text-white">
                      Human confirmation required
                    </span>
                  )}
                </div>

                <div className="text-[12px] font-mono text-black mb-2 break-all">
                  {interceptedAction.action}
                </div>
                <p className="text-[12px] text-black/65 leading-normal mb-4">
                  {interceptedAction.interceptor_reason}
                </p>

                {interceptedAction.status === 'HELD' && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => decideInterceptedAction(false)}
                      disabled={interceptorBusy}
                      className="flex items-center gap-1 px-3 py-1.5 border border-black/10 hover:bg-[#fcf5f5] text-black text-[12px] font-[600] rounded-lg cursor-pointer transition-colors disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                      Block
                    </button>
                    <button
                      onClick={() => decideInterceptedAction(true)}
                      disabled={interceptorBusy}
                      className="flex items-center gap-1 px-4 py-1.5 bg-black text-white hover:bg-black/90 text-[12px] font-[700] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm & allow
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Approval Requests */}
          <div className="bg-white border border-black/10 rounded-xl p-6">
            <h3 className="text-[17px] font-[700] text-black mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-black/60" />
              Pending deployment approvals ({pendingApprovals.length})
            </h3>

            {pendingApprovals.length === 0 ? (
              <div className="border border-black/5 bg-[#f7f7f7]/55 rounded-xl p-6 text-center">
                <ShieldCheck className="w-8 h-8 text-black/30 mx-auto mb-3" />
                <p className="text-[13px] text-black/50 font-[500]">No features holding for human signoff.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {pendingApprovals.map((feat) => (
                    <motion.div
                      key={feat.id}
                      className="border border-black/15 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-4"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-[14px] font-[700] text-black mb-0.5">{feat.name}</h4>
                          <span className="text-[11px] font-mono text-black/50">Repo: {feat.repo}</span>
                        </div>
                        <span className="text-[11px] font-[700] px-2 py-0.5 bg-black text-white rounded-full">
                          Hold
                        </span>
                      </div>

                      <div className="flex items-center gap-2 justify-end pt-3 border-t border-black/5">
                        <button
                          onClick={() => rejectFeature(feat.id)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-black/10 hover:bg-[#fcf5f5] text-black text-[12px] font-[600] rounded-lg cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => approveFeature(feat.id)}
                          className="flex items-center gap-1 px-4 py-1.5 bg-black text-white hover:bg-black/90 text-[12px] font-[700] rounded-lg cursor-pointer transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Approve merge
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Audit Log Ledger */}
        <div className="lg:col-span-6 bg-white border border-black/10 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-5 mb-6">
            <div>
              <h3 className="text-[17px] font-[700] text-black">Audit ledger</h3>
              <p className="text-[12px] text-black/50">Immutable logs of agent interactions and merges.</p>
            </div>
            
            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#f7f7f7] border border-black/10 rounded-lg text-[12px] font-[500] outline-none focus:border-black/30 transition-all w-[180px]"
              />
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {(['all', 'workflow', 'approval', 'policy', 'security'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`
                  px-2.5 py-1 rounded-full text-[11px] font-[600] capitalize transition-colors cursor-pointer
                  ${categoryFilter === cat 
                    ? 'bg-black text-white' 
                    : 'bg-[#f7f7f7] border border-black/5 text-black/60 hover:text-black'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Audit Ledger Scroll Feed */}
          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-black/40 font-[500]">
                No audit entries match current query.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-4 rounded-xl bg-[#f7f7f7]/40 border border-black/5 flex items-start gap-3.5"
                >
                  {/* Category icon indicator */}
                  <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center shrink-0 border border-black/5">
                    {log.category === 'security' && <Shield className="w-4 h-4 text-black" />}
                    {log.category === 'policy' && <Lock className="w-4 h-4 text-black" />}
                    {log.category === 'approval' && <UserCheck className="w-4 h-4 text-black" />}
                    {log.category === 'workflow' && <FileCheck className="w-4 h-4 text-black" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <h4 className="text-[13.5px] font-[700] text-black leading-none">{log.action}</h4>
                      <span className="text-[11px] text-black/40 font-mono flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp}
                      </span>
                    </div>

                    <p className="text-[12.5px] text-black/70 leading-normal mb-2">{log.details}</p>
                    
                    <div className="text-[11px] font-[600] text-black/50">
                      Operator: <span className="font-mono text-black font-[700]">{log.actor}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
