import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`glass rounded-xl ${hover ? 'interactive' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}

export function StatCard({ icon, label, value, sublabel, color = 'text-primary' }: StatCardProps) {
  return (
    <Card hover className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-surface-2 ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function LoadingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-zinc-500 ${className}`} />;
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <Loader2 size={40} className="animate-spin text-primary" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-surface-2 text-zinc-500 mb-4">{icon}</div>
      <p className="text-white font-semibold mb-1">{title}</p>
      {description && <p className="text-sm text-zinc-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: string;
}

export function ProgressBar({ value, max, color = 'bg-primary', height = 'h-2' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`w-full ${height} bg-surface-2 rounded-full overflow-hidden`}>
      <div
        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
