import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden border border-[var(--color-border-subtle)] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[var(--color-text-secondary)]"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-visible flex-1 p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
