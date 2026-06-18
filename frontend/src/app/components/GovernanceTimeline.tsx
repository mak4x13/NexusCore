import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function GovernanceTimeline() {
  const { auditLogs } = useApp();
  // Most recent real audit entries from the Band room (newest first).
  const events = auditLogs.slice(0, 8);

  return (
    <motion.div
      className="bg-white border border-black/10 rounded-xl p-8"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
    >
      <div className="mb-8">
        <h3 className="text-[20px] font-[600] mb-1">Governance Timeline</h3>
        <p className="text-[13px] text-black/60">Live audit trail from the Band room</p>
      </div>

      {events.length === 0 ? (
        <p className="text-[13px] text-black/40">No activity yet — launch a workflow to see the agents collaborate.</p>
      ) : (
        <div className="space-y-0">
          {events.map((item, index) => {
            const time = (item.timestamp || '').slice(11, 16) || '—';
            const isDecision = (item.details || '').includes('DECISION:');
            const isBlock = isDecision && /BLOCK/i.test(item.details);

            return (
              <div key={item.id} className="relative">
                {index < events.length - 1 && (
                  <div className="absolute left-[19px] top-10 w-0.5 h-12">
                    <div className="w-full h-full bg-black/10" />
                  </div>
                )}

                <motion.div
                  className="relative flex items-start gap-4 pb-3"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                >
                  <div className="flex items-center gap-3 min-w-[100px]">
                    <Clock className="w-4 h-4 text-black/40" strokeWidth={1.5} />
                    <span className="text-[13px] font-[500] text-black/60">{time}</span>
                  </div>

                  <div className="relative mt-0.5">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center border
                        ${isBlock ? 'bg-red-500 border-red-500'
                          : isDecision ? 'bg-green-600 border-green-600'
                          : 'bg-black border-black'}
                      `}
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="flex-1 pt-1.5">
                    <div className="text-[14px] font-[600]">{item.actor}</div>
                    <div className="text-[12px] text-black/60 mt-0.5 line-clamp-2">{item.action}</div>
                  </div>

                  {isDecision && (
                    <div className={`text-[11px] font-[600] px-2 py-1 rounded-full mt-1 ${isBlock ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {isBlock ? 'BLOCK' : 'ALLOW'}
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
