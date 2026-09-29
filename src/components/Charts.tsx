import { toPersianDigits } from '@/lib/jalali';

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

export function BarChart({ data, color = 'bg-primary', height = 160, unit = '' }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 30);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium tabular-nums truncate w-full text-center">
              {d.value > 0 ? toPersianDigits(d.value) : ''}
            </span>
            <div
              className={`w-full ${color} rounded-t-md transition-all duration-500 ease-out hover:opacity-80`}
              style={{ height: Math.max(h, 2) }}
            />
            <span className="text-[10px] text-zinc-500 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

export function LineChart({ data, color = '#3b82f6', height = 160, unit = '' }: LineChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - 20 - (d.value / max) * (height - 40);
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height - 20} L 0,${height - 20} Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * width;
          const y = height - 20 - (d.value / max) * (height - 40);
          return <circle key={i} cx={x} cy={y} r="1.2" fill={color} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-zinc-500 flex-1 text-center truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ segments, size = 140 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a1a1f"
            strokeWidth="10"
          />
          {total > 0 &&
            segments.map((seg, i) => {
              const len = (seg.value / total) * circumference;
              const circle = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="10"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              );
              offset += len;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{toPersianDigits(total)}</span>
          <span className="text-[10px] text-zinc-500">مجموع</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${seg.color}`} />
            <span className="text-zinc-300">{seg.label}</span>
            <span className="text-zinc-500 mr-auto tabular-nums">{toPersianDigits(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RingProgressProps {
  value: number;
  max: number;
  size?: number;
  color?: string;
  label?: string;
}

export function RingProgress({ value, max, size = 80, color = '#3b82f6', label }: RingProgressProps) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a1a1f" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-white">{toPersianDigits(Math.round(pct))}٪</span>
        {label && <span className="text-[9px] text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}
