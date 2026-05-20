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
      <div className="flex-shrink-0 border-r border-gray-200 bg-white flex flex-col items-center pt-2">
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
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
      <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto flex flex-col min-w-0">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
          <span>テーブル一覧</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title="サイドバーを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <ul className="flex-1">
          {tables.map((table, index) => (
            <li key={table.id}>
              <button
                onClick={() => setActiveTable(index)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  index === activeTableIndex
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {table.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
