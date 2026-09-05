import React, { useState, useEffect } from 'react';
import { SlaStatus, ReviewDecision } from '../../types/review';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SlaStatusBadgeProps {
  deadline: string | Date;
  decision?: ReviewDecision;
  serverStatus?: SlaStatus;
  size?: 'sm' | 'md' | 'lg';
  showCountdown?: boolean;
  className?: string;
}

export const SlaStatusBadge: React.FC<SlaStatusBadgeProps> = ({
  deadline,
  decision = 'PENDING',
  serverStatus,
  size = 'md',
  showCountdown = true,
  className = '',
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Set up 1-second interval for client-side live countdown
  useEffect(() => {
    if (decision !== 'PENDING') return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [decision]);

  const targetTime = new Date(deadline).getTime();
  const remainingMs = targetTime - now;

  // Compute live status
  let computedStatus: SlaStatus = serverStatus || 'ON_TRACK';

  if (decision !== 'PENDING') {
    computedStatus = 'COMPLETED';
  } else if (remainingMs > 4 * 60 * 60 * 1000) {
    computedStatus = 'ON_TRACK';
  } else if (remainingMs > 0) {
    computedStatus = 'AT_RISK';
  } else {
    computedStatus = 'BREACHED';
  }

  // Format countdown string
  const formatTime = (ms: number): string => {
    if (decision !== 'PENDING') {
      return 'Completed';
    }

    if (ms <= 0) {
      const overdueMs = Math.abs(ms);
      const hours = Math.floor(overdueMs / (1000 * 60 * 60));
      const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours === 0) {
        const secs = Math.floor((overdueMs % (1000 * 60)) / 1000);
        return `${mins}m ${secs}s overdue`;
      }
      return `${hours}h ${mins}m overdue`;
    }

    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 4) {
      return `${hours}h ${mins}m remaining`;
    }

    // When under 4 hours (AT_RISK), include seconds for live ticking urgency
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s remaining`;
    }

    return `${mins}m ${secs}s remaining`;
  };

  const timeString = formatTime(remainingMs);

  // Size styling classes
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  // Visual status variants
  if (computedStatus === 'COMPLETED') {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-md border bg-slate-100 text-slate-700 border-slate-300 ${sizeClasses} ${className}`}
        title="Review SLA completed"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>COMPLETED</span>
      </span>
    );
  }

  if (computedStatus === 'ON_TRACK') {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs ${sizeClasses} ${className}`}
        title={`SLA target: ${new Date(deadline).toLocaleString()}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-bold">ON TRACK</span>
        {showCountdown && (
          <>
            <span className="text-emerald-400 font-normal">•</span>
            <span className="font-mono text-[11px]">{timeString}</span>
          </>
        )}
      </span>
    );
  }

  if (computedStatus === 'AT_RISK') {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-md border bg-amber-50 text-amber-900 border-amber-300 shadow-2xs ${sizeClasses} ${className}`}
        title={`SLA at risk: ${new Date(deadline).toLocaleString()}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="font-bold">AT RISK</span>
        {showCountdown && (
          <>
            <span className="text-amber-400 font-normal">•</span>
            <span className="font-mono text-[11px] font-bold">{timeString}</span>
          </>
        )}
      </span>
    );
  }

  // BREACHED
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border bg-rose-50 text-rose-900 border-rose-300 shadow-2xs ${sizeClasses} ${className}`}
      title={`SLA breached since: ${new Date(deadline).toLocaleString()}`}
    >
      <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />
      <span className="font-bold text-red-700">BREACHED</span>
      {showCountdown && (
        <>
          <span className="text-rose-300 font-normal">•</span>
          <span className="font-mono text-[11px] font-bold text-red-700">{timeString}</span>
        </>
      )}
    </span>
  );
};
