import React from 'react';
import type { QuickActionProps } from '../../types/chat';
import { getAdaptiveActions } from '../../utils/svg';

export const QuickActions: React.FC<QuickActionProps> = ({ onAction, onDownload, svgCode }) => {
  const actions = getAdaptiveActions(svgCode);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => onDownload()}
        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="Download SVG"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      </button>
      {actions.map(({ icon, action, title }) => (
        <button
          key={action}
          onClick={() => {
            onAction(action);
            // Auto submit after selecting action
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          title={title}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}; 