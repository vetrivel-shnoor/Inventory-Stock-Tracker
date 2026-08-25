import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({ 
  icon: Icon = PackageOpen, 
  title = "No Data Found", 
  description = "Get started by creating a new entry.",
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-base)] flex items-center justify-center text-[var(--color-primary)]">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};
