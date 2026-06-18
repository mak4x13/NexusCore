import { motion, AnimatePresence } from 'motion/react';
import { Bot } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

export function LiveAgentFeed() {
  const { auditLogs, features } = useApp();

  // Real Band-room transcript, oldest-first so it reads like a conversation.
  const messages = useMemo(() => auditLogs.slice(0, 15).reverse(), [auditLogs]);
  const isCollaborating = features.some(f => f.status === 'running');

  return (
    <motion.div
      className="bg-white border border-black/10 rounded-xl p-6 h-full flex flex-col"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      <div className="mb-6">
        <h3 className="text-[16px] font-[600] mb-1">Live Agent Collaboration</h3>
        <p className="text-[12px] text-black/60">Real-time decision making</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-[13px] text-black/40">No activity yet — launch a workflow.</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isDecision = (msg.details || '').includes('DECISION:');
            const isBlock = isDecision && /BLOCK/i.test(msg.details);
            return (
              <motion.div
                key={msg.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isBlock ? 'bg-red-100' : isDecision ? 'bg-green-100' : 'bg-[#f7f7f7]'}`}>
                  <Bot className="w-4 h-4 text-black" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[13px] font-[600]">{msg.actor}</span>
                    <span className="text-[11px] text-black/40">{(msg.timestamp || '').slice(11, 16)}</span>
                  </div>
                  <p className="text-[13px] text-black/80 leading-relaxed break-words">{msg.details || msg.action}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isCollaborating && (
        <motion.div
          className="mt-4 pt-4 border-t border-black/10 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-black/40 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
          <span className="text-[12px] text-black/60">Agents are collaborating...</span>
        </motion.div>
      )}
    </motion.div>
  );
}
