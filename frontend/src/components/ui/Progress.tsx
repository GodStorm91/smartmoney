import React from 'react';
import { clsx } from 'clsx';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, max = 100, className }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={clsx('h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700', className)}>
      <div
        className="h-full bg-primary-600 animate-progress-fill rounded-full progress-glow"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default Progress;
