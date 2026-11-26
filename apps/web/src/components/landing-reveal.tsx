'use client';

import { motion, useReducedMotion } from 'motion/react';

export function LandingReveal({
  children,
  className,
  delay = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}>) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.58, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
