import React from 'react';
import { PolicyStatus, VersionStatus } from '../../types/policy';
import { 
  FileEdit, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface StatusBadgeProps {
  status: PolicyStatus | VersionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'DRAFT',
          className: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: FileEdit,
        };
      case 'QUEUED':
      case 'PENDING':
        return {
          label: 'QUEUED FOR REVIEW',
          className: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: Clock,
        };
      case 'UNDER_REVIEW':
        return {
          label: 'UNDER REVIEW',
          className: 'bg-blue-50 text-[#0F2042] border-blue-300',
          icon: Search,
        };
      case 'APPROVED':
        return {
          label: 'APPROVED & PUBLISHED',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'CHANGES_REQUESTED':
        return {
          label: 'CHANGES REQUESTED',
          className: 'bg-red-50 text-[#8B1D2C] border-red-300',
          icon: AlertTriangle,
        };
      default:
        return {
          label: String(status),
          className: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: FileEdit,
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold tracking-wide border uppercase font-mono select-none ${config.className} ${sizeClasses[size]}`}
    >
      {showIcon && <IconComponent className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
};
