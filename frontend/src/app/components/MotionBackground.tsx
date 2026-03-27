import { motion } from 'motion/react';

/**
 * Soft animated gradient + floating orbs behind app content.
 * Fixed, pointer-events-none, sits under z-10 content.
 */
export function MotionBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/95 via-sky-50/85 to-violet-100/75" />

      <motion.div
        className="absolute -left-[20%] -top-[10%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-emerald-400/25 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 10, 0], scale: [1, 1.08, 0.98, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-[15%] top-[20%] h-[min(65vw,480px)] w-[min(65vw,480px)] rounded-full bg-sky-400/20 blur-3xl"
        animate={{ x: [0, -50, 30, 0], y: [0, 60, 20, 0], scale: [1, 1.12, 1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[25%] h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-violet-400/20 blur-3xl"
        animate={{ x: [0, 40, -30, 0], y: [0, -35, 15, 0], scale: [1, 1.06, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 40%)',
        }}
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
