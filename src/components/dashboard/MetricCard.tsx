import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  variant?: 'cyan' | 'amber' | 'rose' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = 'slate',
}) => {
  const borderVariants = {
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
    amber: 'border-amber-500/30 hover:border-amber-500/50',
    rose: 'border-rose-500/30 hover:border-rose-500/50',
    slate: 'border-slate-800 hover:border-slate-700',
  };

  const iconBgVariants = {
    cyan: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
    rose: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
    slate: 'bg-slate-900 text-slate-400 border-slate-800',
  };

  return (
    <div className={`p-5 rounded-lg bg-slate-900/60 border ${borderVariants[variant]} transition-colors flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="mt-2 text-xl font-bold font-mono text-slate-200">
            {value}
          </div>
        </div>
        <div className={`p-2 rounded border ${iconBgVariants[variant]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        {subtext}
      </div>
    </div>
  );
};
