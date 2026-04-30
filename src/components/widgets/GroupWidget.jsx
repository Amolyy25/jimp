import React from 'react';

export default function GroupWidget({ widget }) {
  // A group widget acts purely as a container/background.
  // It renders nothing but a placeholder title in edit mode,
  // because WidgetFrame provides the actual background/border styling.
  return (
    <div className="flex h-full w-full items-start justify-start p-4">
      <span className="pointer-events-none select-none text-[10px] font-bold uppercase tracking-widest text-white/20">
        {widget.data?.title || 'Groupe'}
      </span>
    </div>
  );
}
