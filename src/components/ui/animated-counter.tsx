'use client';

import * as React from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'framer-motion';
import { cn, formatNumber } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  format?: boolean;
  prefix?: string;
  suffix?: string;
}

const AnimatedNumber = ({ value, duration = 0.8 }: { value: number; duration?: number }) => {
  const spring = useSpring(value, { duration: duration * 1000 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  return <motion.span>{display}</motion.span>;
};

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  className,
  duration = 0.8,
  format = false,
  prefix = '',
  suffix = ''
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className={cn('inline-block', className)}>
        {prefix}{format ? formatNumber(value) : value.toLocaleString()}{suffix}
      </span>
    );
  }

  return (
    <motion.span
      className={cn('inline-block', className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      {format ? (
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration }}
        >
          {formatNumber(value)}
        </motion.span>
      ) : (
        <AnimatedNumber value={value} duration={duration} />
      )}
      {suffix}
    </motion.span>
  );
};

export default AnimatedCounter;