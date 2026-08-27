import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export type StatTone = 'primary' | 'success' | 'danger' | 'warning' | 'neutral';

const toneStyles: Record<StatTone, { bg: string; iconBg: string; iconColor: string; valueColor: string; sparkColor: string }> = {
  primary: {
    bg: 'bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 border-emerald-500/30',
    iconBg: 'bg-emerald-400',
    iconColor: 'text-slate-950',
    valueColor: 'text-white',
    sparkColor: '#34d399',
  },
  success: {
    bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-slate-900 dark:text-white',
    sparkColor: '#10b981',
  },
  danger: {
    bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    iconBg: 'bg-red-100 dark:bg-red-500/15',
    iconColor: 'text-red-600 dark:text-red-400',
    valueColor: 'text-slate-900 dark:text-white',
    sparkColor: '#ef4444',
  },
  warning: {
    bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-slate-900 dark:text-white',
    sparkColor: '#f59e0b',
  },
  neutral: {
    bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-500 dark:text-slate-400',
    valueColor: 'text-slate-900 dark:text-white',
    sparkColor: '#64748b',
  },
};

interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** persentase perubahan, contoh 12.8 atau -4.2. undefined = tidak tampil */
  trendPercent?: number;
  trendLabel?: string;
  /** data mini sparkline, contoh [{ v: 10 }, { v: 14 }, ...] */
  sparkline?: number[];
  /** ukuran kartu: 'lg' untuk primary hero card, 'md' untuk kartu sekunder */
  size?: 'lg' | 'md';
  className?: string;
}

/**
 * Kartu statistik finansial (design system global).
 * Dipakai di seluruh dashboard supaya angka finansial selalu punya hierarchy:
 * label kecil -> angka besar -> indikator tren -> (opsional) sparkline.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  caption,
  icon: Icon,
  tone = 'neutral',
  trendPercent,
  trendLabel,
  sparkline,
  size = 'md',
  className = '',
}) => {
  const t = toneStyles[tone];
  const isPrimary = size === 'lg';
  const TrendIcon = trendPercent === undefined ? Minus : trendPercent > 0 ? TrendingUp : trendPercent < 0 ? TrendingDown : Minus;
  const trendColor =
    trendPercent === undefined
      ? ''
      : isPrimary
      ? trendPercent >= 0
        ? 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30'
        : 'text-red-300 bg-red-500/15 border-red-400/30'
      : trendPercent >= 0
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
      : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';

  const sparkData = sparkline?.map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-2xl border shadow-sm ${t.bg} ${isPrimary ? 'p-5 sm:p-6' : 'p-4 sm:p-5'} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-bold uppercase tracking-wider ${isPrimary ? 'text-[11px] text-emerald-300' : 'text-[10px] text-slate-400 dark:text-slate-500'}`}>
          {label}
        </span>
        <div className={`p-2 rounded-xl ${t.iconBg} ${t.iconColor} shrink-0 shadow-sm`}>
          <Icon className={isPrimary ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </div>
      </div>

      <div className={`font-black tracking-tight mt-2 ${t.valueColor} ${isPrimary ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
        {value}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 min-h-[22px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {trendPercent !== undefined && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {trendPercent > 0 ? '+' : ''}
              {trendPercent.toFixed(1)}%
            </span>
          )}
          {(caption || trendLabel) && (
            <span className={`text-[11px] font-medium ${isPrimary ? 'text-emerald-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
              {trendLabel || caption}
            </span>
          )}
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="w-16 h-6 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={t.sparkColor} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={t.sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={t.sparkColor} strokeWidth={2} fill={`url(#spark-${label.replace(/\s/g, '')})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};
