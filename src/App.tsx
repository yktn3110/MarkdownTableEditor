import { useEffect, useCallback, useState, useRef } from 'react';
import { openFile, saveFile } from './lib/fileApi';
import { useAppStore } from './store/tableStore';
import { TableGrid } from './components/TableGrid';
import { TableList } from './components/TableList';

function DropZone({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-lg">Markdownファイルを開いてください</p>
      <button
        onClick={onOpen}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        ファイルを開く
      </button>
    </div>
  );
}

export default function App() {
  const [autoSave, setAutoSave] = useState(false);
  const { filePath, isDirty, tables, activeTableIndex, openFile: openFile2, getSaveContent, markSaved, undo, redo } = useAppStore();

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null;
  const activeTableId = tables[activeTableIndex]?.id;

  const openingRef = useRef(false);
  const handleOpen = useCallback(async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    try {
      const result = await openFile();
      if (result) openFile2(result.path, result.content);
    } finally {
      openingRef.current = false;
    }
  }, [openFile2]);

  const handleSave = useCallback(async () => {
    if (!filePath) return;
    const content = getSaveContent();
    await saveFile(filePath, content);
    markSaved();
  }, [filePath, getSaveContent, markSaved]);

  // 自動保存：変更から1秒後に保存
  useEffect(() => {
    if (!autoSave || !isDirty || !filePath) return;
    const timer = setTimeout(() => handleSave(), 1000);
    return () => clearTimeout(timer);
  }, [autoSave, isDirty, filePath, handleSave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (mod && e.key === 'z' && !e.shiftKey && activeTableId) {
        e.preventDefault();
        undo(activeTableId);
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && activeTableId) {
        e.preventDefault();
        redo(activeTableId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, undo, redo, activeTableId]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* トップバー */}
      <header className="flex items-center gap-2 px-4 h-11 bg-white border-b border-gray-200 text-sm flex-shrink-0">
        <span className="font-bold text-gray-800">TableDraft</span>
        {fileName && (
          <>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-600 truncate max-w-sm">{fileName}</span>
            {isDirty && (
              <span className="text-amber-400 text-lg leading-none" title="未保存の変更あり">
                ●
              </span>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="accent-blue-600"
            />
            自動保存
          </label>
          <button
            onClick={handleOpen}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            開く
          </button>
          <button
            onClick={handleSave}
            disabled={!filePath || !isDirty}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            保存
          </button>
        </div>
      </header>

      {/* メインエリア */}
      <div className="flex flex-1 min-h-0">
        {!filePath ? (
          <DropZone onOpen={handleOpen} />
        ) : tables.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            このファイルにテーブルはありません
          </div>
        ) : (
          <>
            <TableList />
            <TableGrid />
          </>
        )}
      </div>
    </div>
  );
}
