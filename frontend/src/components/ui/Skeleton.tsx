import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      {...props}
    />
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 6 }) => {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="py-4 px-4">
          <Skeleton
            className={`h-4 ${
              idx === 0 ? 'w-24' : idx === 1 ? 'w-48' : idx === cols - 1 ? 'w-20 ml-auto' : 'w-28'
            }`}
          />
        </td>
      ))}
    </tr>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 p-4 shadow-sm rounded-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};
