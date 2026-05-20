import { useEffect, useCallback, useState, useRef } from 'react';
import { openFile, saveFile } from './lib/fileApi';
import { useAppStore } from './store/tableStore';
import { TableGrid } from './components/TableGrid';
import { TableList } from './components/TableList';

function DropZone({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4 border border-slate-800 rounded-lg p-12">
        <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-400 text-sm font-mono">Markdownファイルを開いてください</p>
        <button
          onClick={onOpen}
          className="px-4 py-2 bg-cyan-500 text-slate-950 rounded text-sm font-semibold hover:bg-cyan-400 transition-colors"
        >
          ファイルを開く
        </button>
      </div>
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
    <div className="flex flex-col h-screen bg-slate-950">
      {/* トップバー */}
      <header className="flex items-center gap-2 px-4 h-11 bg-slate-900 border-b border-slate-800 text-sm flex-shrink-0">
        <span className="font-bold text-cyan-400 font-mono tracking-tight">TableDraft</span>
        {fileName && (
          <>
            <span className="text-slate-700 mx-1">/</span>
            <span className="text-slate-300 font-mono text-xs truncate max-w-sm">{fileName}</span>
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="未保存の変更あり" />
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="accent-cyan-500"
            />
            自動保存
          </label>
          <button
            onClick={handleOpen}
            className="px-3 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded border border-slate-700 hover:border-slate-600 transition-colors"
          >
            開く
          </button>
          <button
            onClick={handleSave}
            disabled={!filePath || !isDirty}
            className="px-3 py-1 text-xs font-semibold bg-cyan-500 text-slate-950 rounded hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm font-mono">
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
