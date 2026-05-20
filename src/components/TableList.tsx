import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/tableStore';

const MIN_WIDTH = 120;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 192;

export function TableList() {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { tables, activeTableIndex, setActiveTable } = useAppStore();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + e.clientX - startX.current));
      setWidth(next);
    };
    const onMouseUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width]);

  if (tables.length === 0) return null;

  if (!isOpen) {
    return (
      <div className="flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col items-center pt-2">
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
          title="サイドバーを開く"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex" style={{ width }}>
      <div className="flex-1 border-r border-slate-800 bg-slate-900 overflow-y-auto flex flex-col min-w-0">
        <div className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
          <span>Tables</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-700 hover:text-slate-400 hover:bg-slate-800 rounded transition-colors"
            title="サイドバーを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <ul className="flex-1 py-1">
          {tables.map((table, index) => (
            <li key={table.id}>
              <button
                onClick={() => setActiveTable(index)}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-colors border-l-2 ${
                  index === activeTableIndex
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'
                }`}
              >
                {table.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="w-1 flex-shrink-0 cursor-col-resize bg-slate-800 hover:bg-cyan-400 transition-colors"
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
