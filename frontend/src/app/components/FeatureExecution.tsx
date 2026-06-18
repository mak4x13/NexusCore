import { motion } from 'motion/react';
import { useMemo } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function FeatureExecution() {
  const { features, activeFeatureId } = useApp();

  const feature = useMemo(
    () => features.find(f => f.id === activeFeatureId) || features[0],
    [features, activeFeatureId]
  );

  if (!feature) {
    return (
      <motion.div
        className="bg-white border border-black/10 rounded-xl p-8"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      >
        <h3 className="text-[20px] font-[600] mb-1">Feature Execution</h3>
        <p className="text-[13px] text-black/60">No active workflow — launch one to see the live agent flow.</p>
      </motion.div>
    );
  }

  const stages = feature.stages;
  const completeCount = stages.filter(s => s.status === 'complete').length;
  const isRunning = feature.status === 'running';
  const isBlocked = feature.status === 'failed';
  const isDone = feature.status === 'completed';

  const badge = isRunning
    ? { label: 'In Progress', spin: true, cls: 'bg-[#f7f7f7]' }
    : isBlocked
    ? { label: 'Blocked', spin: false, cls: 'bg-red-50 text-red-700' }
    : isDone
    ? { label: 'Approved', spin: false, cls: 'bg-green-50 text-green-700' }
    : { label: 'Awaiting Approval', spin: false, cls: 'bg-amber-50 text-amber-700' };

  return (
    <motion.div
      className="bg-white border border-black/10 rounded-xl p-8"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
    >
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[20px] font-[600] mb-1">Feature Execution</h3>
            <p className="text-[13px] text-black/60">{feature.name}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${badge.cls}`}>
            {badge.spin
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isBlocked
              ? <XCircle className="w-4 h-4" />
              : <CheckCircle2 className="w-4 h-4" />}
            <span className="text-[13px] font-[600]">{badge.label}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-black/10">
          <motion.div
            className={`h-full ${isBlocked ? 'bg-red-500' : 'bg-black'}`}
            initial={{ width: '0%' }}
            animate={{ width: `${stages.length > 1 ? (completeCount / (stages.length - 1)) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const isComplete = stage.status === 'complete';
            const isActive = stage.status === 'active';
            const isPending = stage.status === 'pending';

            return (
              <div key={stage.name} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    transition-all duration-300 bg-white
                    ${isComplete ? 'border-black bg-black' : ''}
                    ${isActive ? 'border-black' : ''}
                    ${isPending ? 'border-black/20' : ''}
                  `}
                >
                  {isComplete && <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />}
                  {isActive && (
                    <Loader2 className="w-5 h-5 text-black animate-spin" strokeWidth={2} />
                  )}
                  {isPending && <Circle className="w-5 h-5 text-black/20" strokeWidth={2} />}
                </div>
                <div
                  className={`
                    mt-3 text-[12px] font-[500] text-center whitespace-nowrap
                    ${isComplete || isActive ? 'text-black' : 'text-black/40'}
                  `}
                >
                  {stage.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-black/10">
        <div>
          <div className="text-[24px] font-[600]">{completeCount}/{stages.length}</div>
          <div className="text-[12px] text-black/60 mt-0.5">Stages Complete</div>
        </div>
        <div>
          <div className="text-[24px] font-[600]">{feature.elapsed || '—'}</div>
          <div className="text-[12px] text-black/60 mt-0.5">Elapsed Time</div>
        </div>
        <div>
          <div className="text-[24px] font-[600]">
            {isRunning ? 'live' : isBlocked ? 'BLOCK' : isDone ? 'ALLOW' : '—'}
          </div>
          <div className="text-[12px] text-black/60 mt-0.5">Decision</div>
        </div>
      </div>
    </motion.div>
  );
}
